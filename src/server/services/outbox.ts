import { createAdminClient } from "@/lib/supabase/admin";
import { OutboxMessage } from "@/types/domain";
import { renderEmail } from "@/server/services/email-template";

export interface SendMessageParams {
  channel: "whatsapp" | "email";
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
    status: "queued",
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
 * Queues the same notice on WhatsApp next to its email row. Transactional only (booking, cancellation); the buyer
 * consented to WhatsApp contact at sign-up. A missing phone or missing WhatsApp keys never blocks the email: the
 * cron marks the row `skipped` when no provider is connected. Errors are logged, not thrown.
 */
export async function queueWhatsAppCopy(params: {
  phone: string | null | undefined;
  template: string;
  body: string;
  idempotencyKey: string;
  leadId?: string | null;
}): Promise<void> {
  if (!params.phone) return;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("messages_outbox").insert({
      channel: "whatsapp",
      to_address: params.phone,
      template: params.template,
      body: params.body,
      lead_id: params.leadId ?? null,
      idempotency_key: `${params.idempotencyKey}_wa`,
      status: "pending",
    });
    if (error) console.warn(`[outbox] WhatsApp copy not queued: ${error.message}`);
  } catch (err: any) {
    console.warn(`[outbox] WhatsApp copy not queued: ${err?.message}`);
  }
}

/**
 * Sends email via Resend if RESEND_API_KEY is configured, else simulates transmission in DEV only.
 * In production (APP_ENV=production), missing credentials strictly throw to mark message failed with backoff.
 */
export async function sendEmail(
  to: string,
  template: string,
  body: string
): Promise<{ status: "sent" } | { status: "skipped"; reason: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const isProd = process.env.APP_ENV === "production";

  if (!resendApiKey) {
    if (isProd) {
      throw new Error("Missing RESEND_API_KEY in production. Email transmission aborted.");
    }
    // Dev / CI only: nothing is sent, and the row is recorded as skipped rather than delivered.
    console.info(`[Outbox] Email not sent (no RESEND_API_KEY) To: ${to} | Template: ${template}`);
    return { status: "skipped", reason: "RESEND_API_KEY is not set." };
  }

  const rendered = renderEmail(template, body);
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
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
  return { status: "sent" };
}
