import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/cron-auth";
import { istDateString } from "@/lib/ist-format";
import { digestNote } from "@/server/ai/digest-note";
import { enqueueOnce } from "@/server/automations/enqueue";
import { isDigestEmpty, loadDigestData, loadRecipients, planDigests } from "@/server/automations/digests";
import { recordHeartbeat } from "@/server/automations/heartbeat";

export const dynamic = "force-dynamic";

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
    const items: { recipient: (typeof recipients)[number]; data: NonNullable<ReturnType<typeof data.get>>; note: string | null }[] = [];
    for (const recipient of recipients) {
      const facts = data.get(recipient.id);
      if (!facts || alreadyQueued.has(`digest:${recipient.role}:${recipient.id}:${today}`) || isDigestEmpty(facts)) continue;
      items.push({ recipient, data: facts, note: await digestNote(recipient, facts, dateLabel) });
    }

    const rows = planDigests(items, now, alreadyQueued);
    await enqueueOnce(admin, rows);
    return NextResponse.json({ ok: true, data: { recipients: recipients.length, queued: rows.length } });
  } catch (err: any) {
    console.error("[cron/digests] failed:", err?.message);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export const POST = GET;
