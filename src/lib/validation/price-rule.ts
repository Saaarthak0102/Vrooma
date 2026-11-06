import { z } from "zod";

export const priceRuleSchema = z.object({
  city_id: z.string().min(1, "City is required"),
  model_id: z.string().optional().nullable(),
  variant_id: z.string().optional().nullable(),
  fuel: z.enum(["petrol", "diesel", "cng", "ev", "hybrid"]).optional().nullable(),
  road_tax_pct: z.coerce.number().min(0).max(30),
  // Money is stored as whole rupees (context.md: integer rupees convention).
  registration: z.coerce.number().int("Whole rupees only").min(0).max(10_000_000),
  insurance: z.coerce.number().int("Whole rupees only").min(0).max(10_000_000),
  handling: z.coerce.number().int("Whole rupees only").min(0).max(10_000_000),
  accessories: z.coerce.number().int("Whole rupees only").min(0).max(10_000_000),
  tcs_pct: z.coerce.number().min(0).max(5).optional().nullable(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  notes: z.string().max(500).optional().nullable(),
}).refine((r) => Boolean(r.model_id) || Boolean(r.variant_id), {
  // The database requires it (chk_price_rules_scope): a rule always belongs to a model or a variant.
  message: "Choose a model (and optionally one variant) for this rule",
  path: ["model_id"],
}).refine((r) => r.valid_from <= r.valid_until, {
  message: "Valid-until must be on or after valid-from",
  path: ["valid_until"],
});

export type PriceRuleInput = z.infer<typeof priceRuleSchema>;

