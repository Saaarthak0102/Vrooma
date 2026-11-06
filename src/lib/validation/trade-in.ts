import { z } from "zod";
import { normalizeIndianPhone } from "@/lib/phone";

export const tradeInSchema = z.object({
  make: z.string().min(2, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce
    .number()
    .min(2000, "Year must be 2000 or newer")
    .max(new Date().getFullYear() + 1),
  km: z.coerce
    .number()
    .min(0, "Kilometers must be positive")
    .max(500000, "Kilometers cannot exceed 500,000"),
  condition: z.enum(["excellent", "good", "fair"]),
  notes: z.string().max(500).optional(),
  name: z.string().min(2, "Name is required"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "Consent required per DPDP Act 2023",
    }),
  }),
});

export type TradeInInput = z.infer<typeof tradeInSchema>;

export const tradeInSubmissionSchema = z.object({
  make: z.string().trim().min(2, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  year: z.coerce
    .number()
    .min(2000, "Year must be 2000 or newer")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  km: z.coerce
    .number()
    .min(0, "Kilometers must be positive")
    .max(500000, "Kilometers cannot exceed 500,000"),
  // No fuel/transmission: the form never asks for them and trade_in_requests has no such columns.
  condition: z.enum(["excellent", "good", "fair"]),
  notes: z.string().max(500).optional().nullable(),
  name: z.string().trim().min(2, "Name is required"),
  phone: z
    .string()
    .transform((val) => normalizeIndianPhone(val) || "")
    .refine((val) => val.length === 13, {
      message: "Valid 10-digit Indian mobile number required",
    }),
  email: z.string().email().optional().nullable(),
  showroomId: z.string().uuid().optional().nullable(),
  photos: z.array(z.string()).max(6, "Maximum 6 photos allowed").default([]),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Consent required per DPDP Act 2023" }),
  }),
});

export type TradeInSubmissionInput = z.input<typeof tradeInSubmissionSchema>;
