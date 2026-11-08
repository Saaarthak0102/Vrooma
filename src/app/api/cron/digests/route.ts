import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/cron-auth";
import { istDateString } from "@/lib/ist-format";
import { digestNote } from "@/server/ai/digest-note";
import { enqueueOnce } from "@/server/automations/enqueue";
import { isDigestEmpty, loadDigestData, loadRecipients, planDigests } from "@/server/automations/digests";
import { recordHeartbeat } from "@/server/automations/heartbeat";

export const dynamic = "force-dynamic";
/** The free-tier model can take 10+ s per call; give the job room and stop asking it after AI_BUDGET_MS. */
export const maxDuration = 60;
const AI_BUDGET_MS = 40_000;

/**
 * Daily staff digests (08:30 IST). Queues one email per person who has something to act on; the outbox job sends
 * them. Re-running the same day adds nothing, and recipients already queued are skipped before any AI call.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const admin = createAdminClient();
  await recordHeartbeat(admin, "digests");
  try {
    const now = new Date();
    const today = istDateString(now);
    const recipients = await loadRecipients(admin);
    const data = await loadDigestData(admin, recipients, now);

    const { data: existing } = await (admin as any)
      .from("messages_outbox")
      .select("idempotency_key")
      .like("idempotency_key", `digest:%:${today}`)
      .limit(2000);
    const alreadyQueued = new Set<string>((existing ?? []).map((r: any) => r.idempotency_key));

    const dateLabel = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    // Each digest is queued as soon as it is built, so a slow model (or a function time limit) keeps what was done.
    // After AI_BUDGET_MS the rest go out without the AI line; the digest itself does not need it.
    const startedAt = Date.now();
    let queued = 0;
    for (const recipient of recipients) {
      const facts = data.get(recipient.id);
      if (!facts || alreadyQueued.has(`digest:${recipient.role}:${recipient.id}:${today}`) || isDigestEmpty(facts)) continue;
      const note = Date.now() - startedAt < AI_BUDGET_MS ? await digestNote(recipient, facts, dateLabel) : null;
      const rows = planDigests([{ recipient, data: facts, note }], now, alreadyQueued);
      await enqueueOnce(admin, rows);
      queued += rows.length;
    }
    return NextResponse.json({ ok: true, data: { recipients: recipients.length, queued } });
  } catch (err: any) {
    console.error("[cron/digests] failed:", err?.message);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export const POST = GET;
