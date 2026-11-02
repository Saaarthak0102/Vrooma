import { z } from "zod";

export const priceRuleSchema = z.object({
  city_id: z.string().min(1, "City is required"),
  model_id: z.string().optional().nullable(),
  variant_id: z.string().optional().nullable(),
  fuel: z.enum(["petrol", "diesel", "cng", "ev", "hybrid"]).optional().nullable(),
  road_tax_pct: z.coerce.number().min(0).max(30),
  registration: z.coerce.number().min(0),
  insurance: z.coerce.number().min(0),
  handling: z.coerce.number().min(0),
  accessories: z.coerce.number().min(0),
  tcs_pct: z.coerce.number().min(0).max(5).optional().nullable(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  notes: z.string().optional().nullable(),
});

export type PriceRuleInput = z.infer<typeof priceRuleSchema>;

