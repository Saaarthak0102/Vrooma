import { z } from "zod";

export const consentSchema = z.object({
  purpose: z.enum([
    "lead_contact",
    "test_drive_booking",
    "service_booking",
    "trade_in_valuation",
    "marketing_updates",
  ]),
  granted: z.boolean(),
  version: z.string().default("2026.1"),
});

export const deletionRequestSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  reason: z.string().optional(),
  confirmText: z.literal("DELETE MY DATA", {
    errorMap: () => ({ message: "Please type DELETE MY DATA exactly" }),
  }),
});

export type ConsentInput = z.infer<typeof consentSchema>;
export type DeletionRequestInput = z.infer<typeof deletionRequestSchema>;

