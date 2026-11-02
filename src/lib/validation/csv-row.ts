import { z } from "zod";

export const csvLeadRowSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Invalid 10-digit phone")),
  email: z.string().email().optional().or(z.literal("")),
  model: z.string().optional(),
  source: z.string().default("portal"),
  notes: z.string().optional(),
});

export type CsvLeadRowInput = z.infer<typeof csvLeadRowSchema>;

