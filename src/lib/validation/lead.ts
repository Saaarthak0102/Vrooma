import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  showroom_id: z.string().min(1, "Showroom is required"),
  model_id: z.string().optional().nullable(),
  used_car_id: z.string().optional().nullable(),
  message: z.string().max(500, "Message too long").optional(),
  source: z
    .enum(["web", "portal", "social", "walkin", "chat", "trade_in"])
    .default("web"),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "You must consent to receiving contact under DPDP Act 2023",
    }),
  }),
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
