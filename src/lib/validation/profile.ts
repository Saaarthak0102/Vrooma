import { z } from "zod";

export const profileUpdateSchema = z.object({
  id: z.string().optional(),
  full_name: z
    .string()
    .trim()
    .min(2, "Full Name must be at least 2 characters")
    .max(100, "Full Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  whatsapp: z
    .string()
    .trim()
    .refine((val) => {
      const clean = val.replace(/[\s-]/g, "");
      return /^(\+91)?[6-9]\d{9}$/.test(clean);
    }, "Please enter a valid 10-digit Indian WhatsApp number"),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(255, "Address cannot exceed 255 characters"),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit Indian PIN code"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
