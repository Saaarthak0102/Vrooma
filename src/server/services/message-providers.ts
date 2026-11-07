import { sendEmail } from "@/server/services/outbox";

/** "sms" is legacy only (see deliverMessage); nothing new is queued with it. */
export type DeliveryChannel = "email" | "whatsapp" | "sms";

export type DeliveryResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string };

const GRAPH_VERSION = "v21.0";

/** "+91 98765 43210" -> "919876543210" (WhatsApp wants country code + digits, no plus). */
function toProviderNumber(to: string): string {
  return to.replace(/\D/g, "");
}

/**
 * WhatsApp via the Meta WhatsApp Cloud API (free test number; first 1,000 service conversations a month are free).
 *  - Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID. Without them the message is skipped, never "sent".
 *  - WHATSAPP_TEMPLATES is optional JSON, e.g. {"booking_confirmation":{"name":"booking_confirmation","language":"en"}}.
 *    A mapped template is sent as an approved template with the message text as its single body variable
 *    (required to message a customer who has not written to you in the last 24 hours).
 *    Unmapped templates go out as plain text, which Meta only delivers inside that 24-hour window.
 * Throws on a provider error so the outbox retries with backoff and finally marks the row dead.
 */
async function sendWhatsApp(to: string, template: string, body: string): Promise<DeliveryResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return { status: "skipped", reason: "No WhatsApp provider is connected (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not set)." };
  }

  let templates: Record<string, { name: string; language: string }> = {};
  try {
    templates = JSON.parse(process.env.WHATSAPP_TEMPLATES || "{}");
  } catch {
    console.warn("[Outbox] WHATSAPP_TEMPLATES is not valid JSON; sending plain text.");
  }
  const mapped = templates[template];
  // Meta rejects template parameters with newlines, tabs or 4+ spaces, and the whole body must stay under 1024
  // characters including the template's fixed text, so keep the variable to one tidy line of at most 800.
  const templateVariable = body.replace(/\s+/g, " ").trim().slice(0, 800);

  const payload = mapped
    ? {
        messaging_product: "whatsapp",
        to: toProviderNumber(to),
        type: "template",
        template: {
          name: mapped.name,
          language: { code: mapped.language || "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: templateVariable }] }],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: toProviderNumber(to),
        type: "text",
        text: { preview_url: false, body: body.slice(0, 4096) },
      };

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp API error (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return { status: "sent" };
}

/**
 * One place that knows which channels have a real provider.
 * - email: Resend (needs RESEND_API_KEY; without it outside production the message is skipped, never "sent").
 * - whatsapp: Meta WhatsApp Cloud API (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID).
 * SMS was removed (paid, needs DLT). The `sms` value stays in the Postgres enum only because enum values cannot be
 * dropped safely; any old `sms` row is skipped, never sent.
 * Missing keys give "skipped" with a reason. "sent" is returned only after the provider accepted the message.
 */
export async function deliverMessage(
  channel: DeliveryChannel,
  to: string,
  template: string,
  body: string
): Promise<DeliveryResult> {
  if (channel === "email") return sendEmail(to, template, body);
  if (channel === "whatsapp") return sendWhatsApp(to, template, body);
  return { status: "skipped", reason: "SMS is no longer supported; messages go by WhatsApp or email." };
}
