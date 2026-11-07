import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeIndianPhone } from "@/lib/phone";

import { CALL_OUTCOMES } from "@/lib/call-outcomes";

export { CALL_OUTCOMES };
export type { CallOutcome } from "@/lib/call-outcomes";

/** "+91 ******3210": enough for staff to recognise a repeat caller, not enough to call them back. */
export function maskCaller(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalised = normalizeIndianPhone(raw);
  const digits = (normalised ?? raw).replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `+91 ******${digits.slice(-4)}`;
}

/** Salted SHA-256 of the normalised number, used only to count repeat callers. Null when there is no usable number. */
export function hashCaller(raw: string | null | undefined, salt: string): string | null {
  if (!raw) return null;
  const normalised = normalizeIndianPhone(raw) ?? raw.replace(/\D/g, "");
  if (!normalised) return null;
  return createHash("sha256").update(`${salt}:${normalised}`).digest("hex");
}

/** Body a telephony vendor posts for one finished call. Unknown fields are ignored. */
export const callWebhookSchema = z.object({
  externalId: z.string().trim().min(1).max(120),
  outcome: z.enum(CALL_OUTCOMES),
  direction: z.enum(["inbound", "outbound"]).default("inbound"),
  callerNumber: z.string().trim().max(32).optional(),
  workshopId: z.string().uuid().optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CallWebhookPayload = z.infer<typeof callWebhookSchema>;

/** Form a staff member fills in to log a call by hand. */
export const manualCallSchema = z.object({
  outcome: z.enum(CALL_OUTCOMES),
  direction: z.enum(["inbound", "outbound"]).default("inbound"),
  callerNumber: z.string().trim().max(32).optional(),
  workshopId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional(),
});
export type ManualCallInput = z.infer<typeof manualCallSchema>;
