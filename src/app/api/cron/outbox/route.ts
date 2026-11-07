import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/cron-auth";
import { resolveRecipient } from "@/server/automations/alerts";
import { deliverMessage, type DeliveryChannel } from "@/server/services/message-providers";

const BACKOFF_MINUTES = [1, 5, 30, 120];

function getNextAttemptTime(attempts: number): string {
  const delayMinutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)] || 120;
  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  // 1. Secret authorization check
  const denied = authorizeCron(request);
  if (denied) return denied;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  // A worker that crashed mid-send leaves rows in 'sending'; treat them as retryable after 10 minutes.
  const staleCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // 2. Fetch up to 50 eligible pending/retrying messages
  const { data: messages, error: fetchErr } = await admin
    .from("messages_outbox")
    .select("id, channel, to_address, template, body, attempts, idempotency_key, status")
    .or(`status.in.(pending,failed),and(status.eq.sending,updated_at.lt.${staleCutoff})`)
    .lte("next_attempt_at", now)
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(50);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({
      ok: true,
      data: { processed: 0, sent: 0, skipped: 0, failed: 0, dead: 0 },
    });
  }

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let deadCount = 0;

  for (const msg of messages) {
    // Optimistic lock: mark 'sending'
    const { data: claimed, error: lockErr } = await admin
      .from("messages_outbox")
      .update({
        status: "sending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", msg.id)
      .eq("status", msg.status)
      .select("id");

    // An error, or zero rows updated, means another worker claimed it first
    if (lockErr || !claimed || claimed.length === 0) continue;

    try {
      const result = await deliverMessage(msg.channel as DeliveryChannel, resolveRecipient(msg.to_address), msg.template, msg.body);

      if (result.status === "skipped") {
        // Nothing was sent (no provider for this channel). Record that honestly instead of "sent".
        await admin
          .from("messages_outbox")
          .update({
            // "skipped" exists after migration 0030; the generated DB types predate it.
            status: "skipped" as never,
            attempts: msg.attempts + 1,
            last_error: result.reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", msg.id);
        skippedCount++;
        continue;
      }

      // Mark success. The message is already delivered at this point, so a failed bookkeeping write must be
      // retried: leaving the row in 'sending' would make the stale-row retry send the same message twice.
      const markSent = () =>
        admin
          .from("messages_outbox")
          .update({
            status: "sent",
            attempts: msg.attempts + 1,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", msg.id);
      let { error: sentErr } = await markSent();
      if (sentErr) ({ error: sentErr } = await markSent());
      if (sentErr) {
        console.error(`[Outbox Worker] Message ${msg.id} was delivered but could not be marked sent: ${sentErr.message}`);
      }

      sentCount++;
    } catch (err: any) {
      const nextAttempts = msg.attempts + 1;
      const isDead = nextAttempts >= 5;

      if (isDead) {
        deadCount++;
        await admin
          .from("messages_outbox")
          .update({
            status: "dead",
            attempts: nextAttempts,
            last_error: err?.message || "Delivery failed after 5 attempts",
            updated_at: new Date().toISOString(),
          })
          .eq("id", msg.id);

        console.error(`[Outbox Worker] Message ${msg.id} marked DEAD after 5 attempts.`);
      } else {
        failedCount++;
        const nextTime = getNextAttemptTime(nextAttempts);
        await admin
          .from("messages_outbox")
          .update({
            status: "failed",
            attempts: nextAttempts,
            next_attempt_at: nextTime,
            last_error: err?.message || "Delivery failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", msg.id);
      }
    }
  }

  // Rows that exhausted their attempts (for example a crashed final send left in 'sending') are never picked
  // up again by the query above, so close them out as 'dead' instead of leaving them looking in-flight.
  await admin
    .from("messages_outbox")
    .update({ status: "dead", updated_at: new Date().toISOString(), last_error: "Exceeded maximum delivery attempts" })
    .in("status", ["pending", "failed", "sending"])
    .gte("attempts", 5);

  return NextResponse.json({
    ok: true,
    data: {
      processed: messages.length,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      dead: deadCount,
    },
  });
}

export const POST = GET;

