/**
 * Which channel a consultant's reply to a buyer goes out on. One place decides, so adding the WhatsApp keys later is
 * the only step needed to move replies to WhatsApp (nothing else in the code changes).
 *
 *   NOTIFY_CHANNEL=auto      (default) WhatsApp when its keys are set, otherwise email
 *   NOTIFY_CHANNEL=email     always email, even when WhatsApp is connected (for example while templates are in review)
 *   NOTIFY_CHANNEL=whatsapp  always WhatsApp
 *
 * Reminders, booking notices and the like already queue an email plus a WhatsApp copy; the WhatsApp copy is skipped
 * until keys exist, so those need no switch.
 */

export type ReplyChannel = "email" | "whatsapp";

type Env = Record<string, string | undefined>;

/** Same test as the outbox sender and the System health panel. */
export function whatsappConnected(env: Env = process.env): boolean {
  return Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID);
}

export function replyChannel(env: Env = process.env): ReplyChannel {
  const setting = (env.NOTIFY_CHANNEL ?? "auto").trim().toLowerCase();
  if (setting === "email") return "email";
  if (setting === "whatsapp") return "whatsapp";
  return whatsappConnected(env) ? "whatsapp" : "email";
}

export interface ReplyTarget {
  channel: ReplyChannel;
  /** The address to send to, or null when the buyer cannot be reached on this channel. */
  address: string | null;
}

const looksLikeEmail = (v: string | null | undefined): v is string => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Chooses the channel and the real address for it. An email is never addressed to a phone number. */
export function replyTarget(lead: { email?: string | null; phone?: string | null }, env: Env = process.env): ReplyTarget {
  const channel = replyChannel(env);
  if (channel === "email") return { channel, address: looksLikeEmail(lead.email) ? lead.email.trim() : null };
  return { channel, address: lead.phone?.trim() || null };
}

export const NO_EMAIL_MESSAGE = "No email address on file for this lead. Ask for one, or call them; nothing was sent.";
export const NO_PHONE_MESSAGE = "No phone number on file for this lead; nothing was sent.";
