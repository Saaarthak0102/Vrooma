import { z } from "zod";
import { normalizeIndianPhone } from "@/lib/phone";

export const createLeadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name exceeds maximum length"),
    phone: z
      .string()
      .transform((val) => normalizeIndianPhone(val) || "")
      .refine((val) => val.length === 13 && val.startsWith("+91"), {
        message: "Please enter a valid 10-digit Indian mobile number",
      }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    showroom_id: z.string().optional(),
    showroomId: z.string().optional(),
    model_id: z.string().optional().nullable(),
    modelId: z.string().optional().nullable(),
    used_car_id: z.string().optional().nullable(),
    usedCarId: z.string().optional().nullable(),
    message: z
      .string()
      .max(1000, "Message cannot exceed 1000 characters")
      .transform((val) => val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim())
      .optional(),
    source: z
      .enum(["web", "portal", "social", "walkin", "chat", "trade_in"])
      .default("web"),
    consent: z.literal(true, {
      errorMap: () => ({
        message: "You must consent to receiving contact under DPDP Act 2023",
      }),
    }),
    website: z.string().optional(), // Honeypot field
  })
  .transform((data) => ({
    ...data,
    showroom_id: data.showroom_id || data.showroomId || "",
    model_id: data.model_id || data.modelId || null,
    used_car_id: data.used_car_id || data.usedCarId || null,
  }))
  .refine((data) => Boolean(data.showroom_id && data.showroom_id.length > 0), {
    message: "Showroom is required",
    path: ["showroom_id"],
  });

export const updateLeadStatusSchema = z.object({
  status: z.enum([
    "new",
    "contacted",
    "test_drive_booked",
    "negotiating",
    "won",
    "lost",
  ]),
  notes: z.string().optional(),
});

export const reassignLeadSchema = z.object({
  assigned_to: z.string().uuid("Invalid consultant ID"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type ReassignLeadInput = z.infer<typeof reassignLeadSchema>;

