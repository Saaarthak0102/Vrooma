import { createPublicClient } from "@/lib/supabase/public";
import { Variant, VariantColor, FuelType, TransmissionType } from "@/types/domain";
import { cachedQuery } from "@/server/cache";
import { AppError } from "@/lib/errors";

interface FetchVariantsOptions {
  includeInactive?: boolean;
}

/**
 * Fetch colors for given variant IDs using the public client.
 */
async function fetchColorsForVariants(variantIds: string[]): Promise<Record<string, VariantColor[]>> {
  if (variantIds.length === 0) return {};

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("variant_colors")
    .select("id, variant_id, name, hex, image_url")
    .in("variant_id", variantIds)
    .order("id", { ascending: true });

  if (error) {
    console.warn(`[variants] Failed to fetch colors: ${error.message}`);
    return {};
  }

  const map: Record<string, VariantColor[]> = {};
  for (const row of data || []) {
    if (!map[row.variant_id]) {
      map[row.variant_id] = [];
    }
    map[row.variant_id].push({
      id: row.id,
      variant_id: row.variant_id,
      name: row.name,
      hex: row.hex,
      image_url: row.image_url,
    });
  }
  return map;
}

const VARIANT_COLUMNS = "id, model_id, name, fuel, transmission, ex_showroom, specs, features, is_active, created_at, updated_at";

/**
 * Raw fetcher for variants by model ID.
 */
async function fetchVariantsByModel(modelId: string, options: FetchVariantsOptions = {}): Promise<Variant[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("variants")
    .select(VARIANT_COLUMNS)
    .eq("model_id", modelId);

  if (!options.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query
    .order("ex_showroom", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch variants for model ${modelId}: ${error.message}`);
  }

  const rows = data || [];
  const variantIds = rows.map((r) => r.id);
  const colorsMap = await fetchColorsForVariants(variantIds);

  return rows.map((r) => ({
    id: r.id,
    model_id: r.model_id,
    name: r.name,
    fuel: r.fuel as FuelType,
    transmission: r.transmission as TransmissionType,
    ex_showroom: r.ex_showroom,
    specs: (r.specs as Record<string, string>) || {},
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    colors: colorsMap[r.id] || [],
  }));
}

/**
 * List active variants for a given model with their colors.
 * Cached with tag 'models'.
 */
export async function listVariantsByModel(modelId: string): Promise<Variant[]> {
  const cachedFn = cachedQuery(
    () => fetchVariantsByModel(modelId),
    ["variants", "by-model", modelId],
    { tags: ["models", `model:${modelId}`], revalidate: 3600 }
  );
  return cachedFn();
}

/**
 * Fetch a single variant by ID with its colors.
 */
export async function getVariantById(id: string): Promise<Variant | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("variants")
    .select(VARIANT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch variant ${id}: ${error.message}`);
  }

  if (!data) return null;

  const colorsMap = await fetchColorsForVariants([data.id]);

  return {
    id: data.id,
    model_id: data.model_id,
    name: data.name,
    fuel: data.fuel as FuelType,
    transmission: data.transmission as TransmissionType,
    ex_showroom: data.ex_showroom,
    specs: (data.specs as Record<string, string>) || {},
    features: Array.isArray(data.features) ? (data.features as string[]) : [],
    colors: colorsMap[data.id] || [],
  };
}
