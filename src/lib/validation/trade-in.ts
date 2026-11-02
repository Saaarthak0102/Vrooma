import { z } from "zod";

export const tradeInSchema = z.object({
  make: z.string().min(2, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce
    .number()
    .min(2005, "Year must be 2005 or newer")
    .max(new Date().getFullYear() + 1),
  km: z.coerce.number().min(0, "Kilometers must be positive"),
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

