import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getTrustedClientIp } from "@/lib/network";
import { rateLimit } from "@/server/security/rate-limit";
import { callWebhookSchema, hashCaller, maskCaller } from "@/lib/calls";

export const dynamic = "force-dynamic";

function bearerMatches(header: string, secret: string): boolean {
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Telephony vendor webhook: one finished call per request.
 * Auth: `Authorization: Bearer <CALLS_WEBHOOK_SECRET>`. Without the secret configured the endpoint is closed (503).
 * Idempotent on (source=webhook, externalId): a vendor retry returns 200 without a second row.
 */
export async function POST(request: NextRequest) {
  const secret = (env.CALLS_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Call webhook is not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization") ?? "", secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ip = getTrustedClientIp(request) || "unknown";
  if (!(await rateLimit(`calls_webhook_${ip}`, 120, 60))) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON request body" }, { status: 400 });
  }
  const parsed = callWebhookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const c = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from("call_logs").insert({
    source: "webhook",
    external_id: c.externalId,
    outcome: c.outcome,
    direction: c.direction,
    caller_masked: maskCaller(c.callerNumber),
    caller_hash: hashCaller(c.callerNumber, secret),
    workshop_id: c.workshopId,
    duration_seconds: c.durationSeconds,
    notes: c.notes,
    started_at: c.startedAt ?? new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    if (error.code === "23503") return NextResponse.json({ ok: false, error: "Unknown workshopId" }, { status: 422 });
    console.error("[webhooks/calls] insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not store the call" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
