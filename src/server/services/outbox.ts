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
