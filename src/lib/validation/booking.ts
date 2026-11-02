import { z } from "zod";

export const createBookingSchema = z.object({
  kind: z.enum(["test_drive", "service"]),
  slot_id: z.string().min(1, "Slot selection is required"),
  showroom_id: z.string().optional(),
  workshop_id: z.string().optional(),
  demo_car_id: z.string().optional(),
  name: z.string().min(2, "Full name is required"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  vehicle_info: z.object({
    model_name: z.string().min(1, "Vehicle model is required"),
    variant_name: z.string().optional(),
    reg_no: z.string().optional(),
  }),
  notes: z.string().max(300).optional(),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "Consent required per DPDP Act 2023",
    }),
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
