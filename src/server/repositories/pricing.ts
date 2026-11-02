import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { PriceRule } from "@/types/domain";

export interface GetPriceRuleParams {
  cityId: string;
  variantId?: string;
  modelId?: string;
  date?: string | Date;
}

export async function getPriceRule({
  cityId,
  variantId,
  modelId,
  date = new Date(),
}: GetPriceRuleParams): Promise<PriceRule | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const targetDate = typeof date === "string" ? new Date(date) : date;
    const targetIso = targetDate.toISOString().slice(0, 10);

    // 1. First priority: match exact variant & city & date
    let rule = memoryStore.priceRules.find(
      (r) =>
        r.city_id === cityId &&
        r.variant_id === variantId &&
        r.valid_from <= targetIso &&
        r.valid_until >= targetIso
    );

    // 2. Second priority: match model & city & date
    if (!rule && modelId) {
      rule = memoryStore.priceRules.find(
        (r) =>
          r.city_id === cityId &&
          r.model_id === modelId &&
          !r.variant_id &&
          r.valid_from <= targetIso &&
          r.valid_until >= targetIso
      );
    }

    // 3. Fallback: city general rule
    if (!rule) {
      rule = memoryStore.priceRules.find(
        (r) =>
          r.city_id === cityId &&
          !r.model_id &&
          !r.variant_id &&
          r.valid_from <= targetIso &&
          r.valid_until >= targetIso
      );
    }

    return rule ?? null;
  }

  // TODO(day-3): Implement Supabase query
  throw new Error("TODO(day-3): Supabase getPriceRule query not implemented yet");
}

export async function listPriceRules(): Promise<PriceRule[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return [...memoryStore.priceRules];
  }
  throw new Error("TODO(day-3): Supabase listPriceRules not implemented yet");
}
