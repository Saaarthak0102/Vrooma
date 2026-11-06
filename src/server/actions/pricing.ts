"use server";

import { z } from "zod";
import { getPriceRule } from "@/server/repositories/pricing";
import { getVariantById } from "@/server/repositories/variants";
import { getViewer } from "@/server/auth/viewer";
import { computeOnRoad, type OnRoadBreakup } from "@/lib/price-engine";

/**
 * Gated on-road price.
 *
 *  - signed out  -> { tier: "teaser" }: the headline total and validity date ONLY. No lines, no rule values.
 *  - signed in   -> { tier: "full" }: the itemised breakup (road tax, registration, insurance, handling,
 *                   accessories, TCS) with validity date and notes.
 *
 * Both tiers are computed on the server from the admin price table (price_rules via resolve_price_rule)
 * with the one tested engine (computeOnRoad). The browser never receives the raw rule.
 */
export type OnRoadResult =
  | { tier: "teaser"; total: number; validUntil: string }
  | { tier: "full"; breakup: OnRoadBreakup }
  | { tier: "unavailable" };

const inputSchema = z.object({
  variantId: z.string().uuid(),
  city: z.enum(["lucknow", "kanpur"]),
  includeAccessories: z.boolean().optional(),
});

export type GetOnRoadInput = z.input<typeof inputSchema>;

export async function getOnRoadAction(input: GetOnRoadInput): Promise<OnRoadResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { tier: "unavailable" };
  const { variantId, city, includeAccessories = true } = parsed.data;

  const variant = await getVariantById(variantId);
  if (!variant) return { tier: "unavailable" };

  const rule = await getPriceRule({
    cityId: city,
    variantId: variant.id,
    modelId: variant.model_id,
    fuel: variant.fuel,
  });

  const viewer = await getViewer();
  if (!viewer.isAuthenticated) {
    // Teaser is always the default package, so the number never depends on accessory toggles.
    const headline = computeOnRoad({ variant, rule, includeAccessories: true });
    if (!headline) return { tier: "unavailable" };
    return { tier: "teaser", total: headline.total, validUntil: headline.validUntil };
  }

  const breakup = computeOnRoad({ variant, rule, includeAccessories });
  if (!breakup) return { tier: "unavailable" };
  return { tier: "full", breakup };
}
