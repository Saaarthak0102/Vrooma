import { sendEmail } from "@/server/services/outbox";

export type DeliveryChannel = "email" | "whatsapp" | "sms";

export type DeliveryResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string };

const GRAPH_VERSION = "v21.0";

/** "+91 98765 43210" -> "919876543210" (both providers want country code + digits, no plus). */
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
    return { status: "skipped", reason: "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID are not set." };
  }

  let templates: Record<string, { name: string; language: string }> = {};
  try {
    templates = JSON.parse(process.env.WHATSAPP_TEMPLATES || "{}");
  } catch {
    console.warn("[Outbox] WHATSAPP_TEMPLATES is not valid JSON; sending plain text.");
  }
  const mapped = templates[template];

  const payload = mapped
    ? {
        messaging_product: "whatsapp",
        to: toProviderNumber(to),
        type: "template",
        template: {
          name: mapped.name,
          language: { code: mapped.language || "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: body.slice(0, 1000) }] }],
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
 * SMS via MSG91's Flow API. Indian SMS must use a DLT-registered template, so the whole message text is passed as
 * the single variable VAR1 of one approved template (MSG91_TEMPLATE_ID). Needs MSG91_AUTH_KEY and MSG91_TEMPLATE_ID.
 */
async function sendSms(to: string, body: string): Promise<DeliveryResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    return { status: "skipped", reason: "MSG91_AUTH_KEY / MSG91_TEMPLATE_ID are not set." };
  }

  const res = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { authkey: authKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      short_url: "0",
      recipients: [{ mobiles: toProviderNumber(to), VAR1: body.slice(0, 160) }],
    }),
  });
  const text = await res.text();
  // MSG91 answers 200 with {"type":"error"} for rejected requests.
  if (!res.ok || /"type"\s*:\s*"error"/i.test(text)) {
    throw new Error(`MSG91 API error (${res.status}): ${text.slice(0, 300)}`);
  }
  return { status: "sent" };
}

/**
 * One place that knows which channels have a real provider.
 * - email: Resend (needs RESEND_API_KEY; without it outside production the message is skipped, never "sent").
 * - whatsapp: Meta WhatsApp Cloud API (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID).
 * - sms: MSG91 Flow API (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID).
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
  return sendSms(to, body);
}
