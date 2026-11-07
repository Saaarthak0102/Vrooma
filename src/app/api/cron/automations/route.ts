import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/cron-auth";
import { runAutomations } from "@/server/automations/run";

export const dynamic = "force-dynamic";

/**
 * Date-driven automations (reminders, missing booking outcomes, escalations, expiry alerts). Called every 5
 * minutes by pg_cron. It only queues messages; /api/cron/outbox delivers them.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const results = await runAutomations(createAdminClient());
  const failed = results.filter((r) => r.error);
  return NextResponse.json({ ok: failed.length === 0, data: { results } }, { status: failed.length ? 500 : 200 });
}

export const POST = GET;
