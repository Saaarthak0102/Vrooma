"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { manualCallSchema, hashCaller, maskCaller } from "@/lib/calls";
import { env } from "@/lib/env";

/** Staff types in a service-desk call. RLS only lets staff insert rows attributed to themselves. */
export async function logCallAction(input: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    const { user } = await requireRole("consultant", "manager", "admin");
    const parsed = manualCallSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", "Check the call details.", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const c = parsed.data;

    const supabase = await createClient();
    if (!supabase) return errorResponse("INTERNAL_ERROR", "Database client unavailable");

    const { data, error } = await supabase
      .from("call_logs")
      .insert({
        source: "manual",
        outcome: c.outcome,
        direction: c.direction,
        caller_masked: maskCaller(c.callerNumber),
        caller_hash: hashCaller(c.callerNumber, env.CALLS_WEBHOOK_SECRET || "vrooma"),
        workshop_id: c.workshopId,
        notes: c.notes,
        handled_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) return errorResponse("INTERNAL_ERROR", error?.message || "Could not log the call.");
    return successResponse({ id: data.id });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not log the call.");
  }
}

export interface CallMetrics {
  totalCalls: number;
  answered: number;
  unanswered: number;
  /** null when there are no calls in the window */
  unansweredPct: number | null;
}

/** Live unanswered-call rate for the admin overview (inbound calls, missed + voicemail). */
export async function getCallMetricsAction(days = 30): Promise<ActionResponse<CallMetrics>> {
  try {
    await requireRole("admin", "manager");
    const supabase = await createClient();
    if (!supabase) return errorResponse("INTERNAL_ERROR", "Database client unavailable");

    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.rpc("get_call_metrics", { p_from: from, p_to: new Date().toISOString() });
    if (error) return errorResponse("INTERNAL_ERROR", `Failed to compute call metrics: ${error.message}`);

    const m = (data as any) || {};
    return successResponse({
      totalCalls: Number(m.total_calls || 0),
      answered: Number(m.answered || 0),
      unanswered: Number(m.unanswered || 0),
      unansweredPct: m.unanswered_pct === null || m.unanswered_pct === undefined ? null : Number(m.unanswered_pct),
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not retrieve call metrics.");
  }
}
