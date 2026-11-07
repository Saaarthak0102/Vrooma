"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { formatIstDateTime, istDateString } from "@/lib/ist-format";
import type { AgentProposal, ConsultantOption, SlotOption } from "@/lib/lead-agent";
import { suggestNextSteps } from "@/server/ai/lead-agent";
import { alertEmail } from "@/server/automations/alerts";
import { enqueueOnce } from "@/server/automations/enqueue";
import { getLeadById } from "@/server/repositories/leads";
import { listSlots } from "@/server/repositories/slots";
import { listShowrooms } from "@/server/repositories/showrooms";
import { listUsers } from "@/server/repositories/users";
import { rateLimit } from "@/server/security/rate-limit";
import { loadLeadAiInput } from "@/server/services/lead-copilot-persist";
import type { Lead } from "@/types/domain";

// lead_tasks is newer than the generated Supabase types.
const db = (): any => createAdminClient();

export interface LeadTaskView {
  id: string;
  kind: string;
  title: string;
  reason: string | null;
  dueAt: string;
  status: "open" | "done" | "dismissed";
}

/** Same rule as the lead drawer: a consultant only works on their own leads, and others read as "not found". */
async function authorise(leadId: string): Promise<{ lead: Lead; userId: string; role: string } | { error: ActionResponse<never> }> {
  const { user, profile } = await requireRole("consultant", "manager", "admin");
  const lead = await getLeadById(leadId);
  if (!lead || (profile.role === "consultant" && lead.assigned_to !== user.id)) {
    return { error: errorResponse("NOT_FOUND", "Lead not found.") };
  }
  return { lead, userId: user.id, role: profile.role };
}

const taskView = (r: any): LeadTaskView => ({ id: r.id, kind: r.kind, title: r.title, reason: r.reason, dueAt: r.due_at, status: r.status });

/**
 * "Suggest next steps": runs the Lead Desk Agent for one lead. Read-only; nothing is changed until the consultant
 * approves a suggestion. Limited to 10 runs a minute per person.
 */
export async function getLeadProposalsAction(
  leadId: string,
): Promise<ActionResponse<{ proposals: AgentProposal[]; source: "ai" | "fallback" }>> {
  try {
    const auth = await authorise(leadId);
    if ("error" in auth) return auth.error;
    const { lead, userId } = auth;

    if (!(await rateLimit(`agent_${userId}`, 10, 60))) {
      return errorResponse("RATE_LIMITED", "You are asking too quickly. Please wait a moment.");
    }

    const [input, slotRows, showrooms, consultants, openLeads] = await Promise.all([
      loadLeadAiInput(lead),
      listSlots({ kind: "test_drive", showroomId: lead.showroom_id, limit: 40 }).catch(() => []),
      listShowrooms().catch(() => []),
      listUsers("consultant"),
      db().from("leads").select("assigned_to").in("status", ["new", "contacted", "test_drive_booked", "negotiating"]).limit(5000),
    ]);

    const place = showrooms.find((s) => s.id === lead.showroom_id)?.name ?? "the showroom";
    const slots: SlotOption[] = slotRows
      .filter((s) => s.capacity - s.booked_count > 0)
      .slice(0, 6)
      .map((s) => ({ id: s.id, label: `${formatIstDateTime(s.starts_at)} at ${place}` }));

    const load = new Map<string, number>();
    for (const row of openLeads.data ?? []) if (row.assigned_to) load.set(row.assigned_to, (load.get(row.assigned_to) ?? 0) + 1);
    const people: ConsultantOption[] = consultants
      .filter((c) => c.is_active !== false)
      .map((c) => ({ id: c.id, name: c.full_name, openLeads: load.get(c.id) ?? 0 }));

    const result = await suggestNextSteps(
      input,
      { slots, consultants: people, currentAssigneeId: lead.assigned_to ?? null },
      { userId, leadId },
    );
    return successResponse({ proposals: result.proposals, source: result.source });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not get suggestions.");
  }
}

/** Approve a "task" suggestion (or add one by hand). */
export async function createLeadTaskAction(
  leadId: string,
  title: string,
  dueInHours: number,
  reason?: string,
  source: "agent" | "manual" = "agent",
): Promise<ActionResponse<LeadTaskView>> {
  try {
    const auth = await authorise(leadId);
    if ("error" in auth) return auth.error;
    const clean = (title ?? "").trim();
    if (clean.length < 3 || clean.length > 100) return errorResponse("VALIDATION_FAILED", "Task title must be 3-100 characters.");
    const due = new Date(Date.now() + Math.min(168, Math.max(0, Number(dueInHours) || 0)) * 3600_000).toISOString();

    const { data, error } = await db()
      .from("lead_tasks")
      .insert({
        lead_id: leadId,
        assigned_to: auth.lead.assigned_to ?? auth.userId,
        kind: dueInHours === 0 ? "call_now" : "follow_up",
        title: clean,
        reason: reason ? reason.slice(0, 300) : null,
        due_at: due,
        source,
        created_by: auth.userId,
      })
      .select("id, kind, title, reason, due_at, status")
      .single();
    if (error) return errorResponse("INTERNAL_ERROR", error.message);
    return successResponse(taskView(data));
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not create the task.");
  }
}

/** Approve an "escalate" suggestion: a task for the managers plus one email to the shared alert mailbox. */
export async function escalateLeadAction(leadId: string, reason: string): Promise<ActionResponse<{ queued: boolean }>> {
  try {
    const auth = await authorise(leadId);
    if ("error" in auth) return auth.error;
    const why = (reason ?? "").trim().slice(0, 300);
    if (why.length < 3) return errorResponse("VALIDATION_FAILED", "Give a short reason.");

    const admin = db();
    const day = istDateString(new Date());
    await admin.from("lead_tasks").upsert(
      {
        lead_id: leadId,
        assigned_to: null,
        kind: "escalate",
        title: `Manager needed: ${auth.lead.name}`,
        reason: why,
        due_at: new Date().toISOString(),
        source: "agent",
        idempotency_key: `escalate:${leadId}:${day}`,
        created_by: auth.userId,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    );

    const to = alertEmail();
    if (to) {
      await enqueueOnce(admin, [
        {
          channel: "email",
          to_address: to,
          template: "lead_escalated",
          body: `A consultant escalated lead ${auth.lead.ref ?? leadId.slice(0, 8)} (${auth.lead.name}): ${why}`,
          idempotency_key: `escalate:${leadId}:${day}:mail`,
          lead_id: leadId,
        },
      ]);
    }
    return successResponse({ queued: Boolean(to) });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not escalate.");
  }
}

export async function listLeadTasksAction(leadId: string): Promise<ActionResponse<LeadTaskView[]>> {
  try {
    const auth = await authorise(leadId);
    if ("error" in auth) return auth.error;
    const { data, error } = await db()
      .from("lead_tasks")
      .select("id, kind, title, reason, due_at, status")
      .eq("lead_id", leadId)
      .eq("status", "open")
      .order("due_at", { ascending: true })
      .limit(20);
    // Table missing (migration 0040 not applied yet): show no tasks rather than an error.
    if (error) return successResponse([]);
    return successResponse((data ?? []).map(taskView));
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not load tasks.");
  }
}

export async function completeLeadTaskAction(taskId: string, outcome: "done" | "dismissed" = "done"): Promise<ActionResponse<{ id: string }>> {
  try {
    const { user, profile } = await requireRole("consultant", "manager", "admin");
    const admin = db();
    const { data: task } = await admin.from("lead_tasks").select("id, lead_id, assigned_to").eq("id", taskId).maybeSingle();
    if (!task) return errorResponse("NOT_FOUND", "Task not found.");
    if (profile.role === "consultant" && task.assigned_to !== user.id) return errorResponse("NOT_FOUND", "Task not found.");
    const { error } = await admin
      .from("lead_tasks")
      .update({ status: outcome === "dismissed" ? "dismissed" : "done", done_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) return errorResponse("INTERNAL_ERROR", error.message);
    return successResponse({ id: taskId });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not update the task.");
  }
}
