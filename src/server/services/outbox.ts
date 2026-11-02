import { memoryStore } from "@/server/store";
import { OutboxMessage } from "@/types/domain";

export interface SendMessageParams {
  channel: "whatsapp" | "sms" | "email";
  to: string;
  template: string;
  body: string;
  leadId?: string;
}

/**
 * Mock outbox dispatcher. Logs simulated dispatch and saves to memory store.
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

  memoryStore.addOutbox(msg);
  console.info(`[Outbox Dispatch ${params.channel.toUpperCase()}] To: ${params.to} | Body: ${params.body}`);
  return msg;
}
