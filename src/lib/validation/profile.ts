import { z } from "zod";
import { normalizeIndianPhone } from "@/lib/phone";

export const profileBaseSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters")
    .regex(/^[\p{L}\p{M}\s.'-]+$/u, "Name contains invalid characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email too long")
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .transform((val, ctx) => {
      const norm = normalizeIndianPhone(val);
      if (!norm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid 10-digit Indian mobile number (+91 6-9XXXXXXXXX)",
        });
        return val;
      }
      return norm;
    }),
  city_id: z.string().min(1, "Please select your city"),
  locale: z.enum(["en", "hi"]).default("en"),
  // Optional profile fields
  address: z
    .string()
    .trim()
    .max(255, "Address cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit Indian PIN code")
    .optional()
    .or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((val, ctx) => {
      if (!val) return undefined;
      const norm = normalizeIndianPhone(val);
      if (!norm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid WhatsApp number format",
        });
        return val;
      }
      return norm;
    }),
});

/**
 * Sign-up and profile completion schema, requiring statutory DPDP consents
 */
export const completeProfileSchema = profileBaseSchema.extend({
  terms_consent: z.literal(true, {
    errorMap: () => ({
      message: "You must confirm you are 18 or older and agree to Terms & Privacy Notice",
    }),
  }),
  service_consent: z.literal(true, {
    errorMap: () => ({
      message: "Consent to receive booking updates and enquiry communications is required",
    }),
  }),
  marketing_consent: z.boolean().default(false),
});

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

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
