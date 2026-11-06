import { createAdminClient } from "@/lib/supabase/admin";
import { OutboxMessage } from "@/types/domain";

export interface SendMessageParams {
  channel: "whatsapp" | "sms" | "email";
  to: string;
  template: string;
  body: string;
  leadId?: string;
}

/**
 * Outbox dispatcher. Records messages in messages_outbox.
 */
export async function dispatchMessage(params: SendMessageParams): Promise<OutboxMessage> {
  const msg: OutboxMessage = {
    id: `msg-${Date.now()}`,
    channel: params.channel,
    to_phone_or_email: params.to,
    template: params.template,
    body: params.body,
    lead_id: params.leadId ?? null,
    status: "sent",
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createAdminClient();
    await supabase.from("messages_outbox").insert({
      channel: params.channel,
      to_address: params.to,
      template: params.template,
      body: params.body,
      lead_id: params.leadId ?? null,
      status: "pending",
      idempotency_key: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
  } catch (err: any) {
    console.warn(`[outbox] Failed to persist outbox record: ${err?.message}`);
  }

  console.info(`[Outbox Dispatch ${params.channel.toUpperCase()}] To: ${params.to} | Body: ${params.body}`);
  return msg;
}

/**
 * Sends email via Resend if RESEND_API_KEY is configured, else simulates transmission in DEV only.
 * In production (APP_ENV=production), missing credentials strictly throw to mark message failed with backoff.
 */
export async function sendEmail(to: string, template: string, body: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const isProd = process.env.APP_ENV === "production";

  if (!resendApiKey) {
    if (isProd) {
      throw new Error("Missing RESEND_API_KEY in production. Email transmission aborted.");
    }
    // Simulated delivery for dev / CI environments only
    console.info(`[Outbox Worker Simulated Email] To: ${to} | Template: ${template}`);
    return;
  }

  const fromAddress = process.env.EMAIL_FROM || "Vrooma Lucknow <notifications@vrooma.in>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject: `Vrooma Dealership Notification: ${template.replace(/_/g, " ")}`,
      text: body,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}
