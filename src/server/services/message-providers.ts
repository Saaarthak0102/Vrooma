import { sendEmail } from "@/server/services/outbox";

export type DeliveryChannel = "email" | "whatsapp" | "sms";

export type DeliveryResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string };

/**
 * One place that knows which channels have a real provider.
 * - email: Resend (needs RESEND_API_KEY; without it outside production the message is skipped, never "sent").
 * - whatsapp / sms: no provider is connected yet, so they are skipped with a clear reason. To add one, implement
 *   the branch below and return { status: "sent" } only after the provider accepted the message.
 */
export async function deliverMessage(
  channel: DeliveryChannel,
  to: string,
  template: string,
  body: string
): Promise<DeliveryResult> {
  if (channel === "email") {
    return sendEmail(to, template, body);
  }
  return { status: "skipped", reason: `No ${channel === "sms" ? "SMS" : "WhatsApp"} provider is connected yet.` };
}
