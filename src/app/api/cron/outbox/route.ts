import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const BACKOFF_MINUTES = [1, 5, 30, 120];

function getNextAttemptTime(attempts: number): string {
  const delayMinutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)] || 120;
  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

/**
 * Sends email via Resend if RESEND_API_KEY is configured, else simulates transmission.
 */
async function sendEmail(to: string, template: string, body: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vrooma Lucknow <updates@vrooma.in>",
        to: [to],
        subject: `Vrooma Dealership Notification: ${template.replace(/_/g, " ")}`,
        text: body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API error (${res.status}): ${errText}`);
    }
  } else {
    // Simulated delivery for dev / CI environments
    console.info(`[Outbox Worker Simulated Email] To: ${to} | Template: ${template}`);
  }
}

export async function GET(request: NextRequest) {
  // 1. Secret authorization check
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");

  if (env.CRON_SECRET && secret !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron execution" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 2. Fetch up to 50 eligible pending/retrying messages
  const { data: messages, error: fetchErr } = await admin
    .from("messages_outbox")
    .select("id, channel, to_address, template, body, attempts, idempotency_key, status")
    .in("status", ["pending", "failed"])
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
      data: { processed: 0, sent: 0, failed: 0, dead: 0 },
    });
  }

  let sentCount = 0;
  let failedCount = 0;
  let deadCount = 0;

  for (const msg of messages) {
    // Optimistic lock: mark 'sending'
    const { error: lockErr } = await admin
      .from("messages_outbox")
      .update({
        status: "sending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", msg.id)
      .eq("status", msg.status);

    if (lockErr) continue; // Claimed by another concurrent worker

    try {
      if (msg.channel === "email") {
        await sendEmail(msg.to_address, msg.template, msg.body);
      } else {
        // WhatsApp / SMS templates queued and recorded as dispatched in Phase 4
        console.info(`[Outbox Worker Simulated ${msg.channel.toUpperCase()}] To: ${msg.to_address}`);
      }

      // Mark success
      await admin
        .from("messages_outbox")
        .update({
          status: "sent",
          attempts: msg.attempts + 1,
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", msg.id);

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

  return NextResponse.json({
    ok: true,
    data: {
      processed: messages.length,
      sent: sentCount,
      failed: failedCount,
      dead: deadCount,
    },
  });
}

