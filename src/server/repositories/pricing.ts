import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { PriceRule, FuelType } from "@/types/domain";
import { cachedQuery } from "@/server/cache";
import { AppError } from "@/lib/errors";

export interface GetPriceRuleParams {
  cityId: string;
  variantId?: string;
  modelId?: string;
  fuel?: FuelType;
  date?: string | Date;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeCityId(id?: string): string | null {
  if (!id) return null;
  const lower = id.toLowerCase().trim();
  if (lower === "city-lucknow" || lower === "lucknow") {
    return "c0000001-0000-0000-0000-000000000001";
  }
  if (lower === "city-kanpur" || lower === "kanpur") {
    return "c0000001-0000-0000-0000-000000000002";
  }
  return UUID_REGEX.test(id) ? id : null;
}

function normalizeModelId(id?: string): string | null {
  if (!id) return null;
  const lower = id.toLowerCase().trim();
  if (lower === "model-h") return "d0000001-0000-0000-0000-000000000001";
  if (lower === "model-c") return "d0000001-0000-0000-0000-000000000002";
  if (lower === "model-s") return "d0000001-0000-0000-0000-000000000003";
  if (lower === "model-x") return "d0000001-0000-0000-0000-000000000004";
  if (lower === "model-t") return "d0000001-0000-0000-0000-000000000005";
  return UUID_REGEX.test(id) ? id : null;
}

function normalizeVariantId(id?: string): string | null {
  if (!id) return null;
  const lower = id.toLowerCase().trim();
  if (lower === "var-h-zx-at") return "e0000001-0000-0000-0000-000000000001";
  if (lower === "var-h-vx-mt") return "e0000001-0000-0000-0000-000000000002";
  if (lower === "var-c-vx-dsl") return "e0000001-0000-0000-0000-000000000003";
  return UUID_REGEX.test(id) ? id : null;
}

function mapRowToPriceRule(row: any): PriceRule {
  return {
    id: row.id,
    city_id: row.city_id,
    model_id: row.model_id,
    variant_id: row.variant_id,
    fuel: row.fuel as FuelType | null,
    road_tax_pct: Number(row.road_tax_pct),
    registration: Number(row.registration),
    insurance: Number(row.insurance),
    handling: Number(row.handling),
    accessories: Number(row.accessories),
    tcs_pct: Number(row.tcs_pct),
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    notes: row.notes || undefined,
  };
}

/**
 * Resolves the applicable on-road pricing rule using the public client and PostgreSQL RPC resolve_price_rule.
 * Honors priority precedence:
 * 1. Variant-specific rule
 * 2. Model + Fuel rule
 * 3. Model general rule
 * 4. City fallback
 */
export async function getPriceRule({
  cityId,
  variantId,
  modelId,
  fuel,
  date = new Date(),
}: GetPriceRuleParams): Promise<PriceRule | null> {
  const normCity = normalizeCityId(cityId);
  if (!normCity) return null;

  const normVariant = normalizeVariantId(variantId);
  const normModel = normalizeModelId(modelId);

  const targetDate = typeof date === "string" ? new Date(date) : date;
  const targetIso = targetDate.toISOString().slice(0, 10);

  const cachedFn = cachedQuery(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase.rpc("resolve_price_rule", {
        p_city_id: normCity,
        p_variant_id: normVariant,
        p_model_id: normModel,
        p_fuel: (fuel as any) || null,
        p_date: targetIso,
      });

      if (error) {
        console.warn(`[pricing] resolve_price_rule error: ${error.message}`);
        return null;
      }

      if (!data) return null;
      return mapRowToPriceRule(data);
    },
    ["price-rule", normCity, normVariant || "none", normModel || "none", fuel || "none", targetIso],
    { tags: ["price"], revalidate: 3600 }
  );

  return cachedFn();
}

/**
 * List all configured price rules for administrative review and audit.
 * Uses admin client to bypass RLS for administrative console.
 */
export async function listPriceRules(): Promise<PriceRule[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("price_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("INTERNAL_ERROR", 500, `Failed to list price rules: ${error.message}`);
    }

    return (data ?? []).map(mapRowToPriceRule);
  } catch (err: any) {
    // If admin secret key is not available (e.g. client runtime), fallback to public query
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("price_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(`[pricing] listPriceRules fallback error: ${error.message}`);
      return [];
    }

    return (data ?? []).map(mapRowToPriceRule);
  }
}
