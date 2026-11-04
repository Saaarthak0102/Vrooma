import { createPublicClient } from "@/lib/supabase/public";
import { Model, Variant, BodyType } from "@/types/domain";
import { cachedQuery } from "@/server/cache";
import { AppError } from "@/lib/errors";
import { listVariantsByModel } from "./variants";

export interface ListModelsParams {
  bodyType?: string;
  fuel?: string;
  maxPrice?: number;
  search?: string;
  limit?: number;
}

/**
 * Attach variants and calculate model price ranges.
 * Prices are derived from variant ex_showroom values.
 */
function enrichModel(model: Model, variants: Variant[]): Model {
  const modelVariants = variants.filter(
    (variant) => variant.model_id === model.id
  );

  const prices = modelVariants.map((variant) => variant.ex_showroom);

  return {
    ...model,
    variants: modelVariants,
    min_price: prices.length ? Math.min(...prices) : undefined,
    max_price: prices.length ? Math.max(...prices) : undefined,
  };
}

/**
 * Fetch variants belonging to a set of models.
 */
async function fetchVariantsForModels(modelIds: string[]): Promise<Variant[]> {
  if (modelIds.length === 0) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("variants")
    .select("id, model_id, name, fuel, transmission, ex_showroom, specs, features, is_active")
    .in("model_id", modelIds)
    .eq("is_active", true)
    .order("ex_showroom", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch model variants: ${error.message}`);
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    model_id: r.model_id,
    name: r.name,
    fuel: r.fuel as any,
    transmission: r.transmission as any,
    ex_showroom: r.ex_showroom,
    specs: (r.specs as Record<string, string>) || {},
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
  }));
}

const MODEL_COLUMNS = "id, slug, name, tagline, tagline_hi, body_type, hero_image, gallery, is_active, is_featured, created_at, updated_at";

/**
 * Raw database query to list active models with deterministic ordering.
 */
async function queryActiveModels(limit: number = 50): Promise<Model[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("models")
    .select(MODEL_COLUMNS)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch models: ${error.message}`);
  }

  const models: Model[] = (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    body_type: row.body_type as BodyType,
    tagline: row.tagline,
    hero_image: row.hero_image,
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
    is_active: row.is_active,
    is_featured: row.is_featured,
    created_at: row.created_at,
  }));

  if (models.length === 0) return [];

  const variants = await fetchVariantsForModels(models.map((m) => m.id));
  return models.map((m) => enrichModel(m, variants));
}

/**
 * List active car models with their variants.
 * Supports search, body type, fuel and price filtering.
 * Wrapped with Next.js tagged caching.
 */
export async function listModels(
  params: ListModelsParams = {}
): Promise<Model[]> {
  const getCachedModels = cachedQuery(
    () => queryActiveModels(Math.min(params.limit || 50, 100)),
    ["models", "active", "list"],
    { tags: ["models"], revalidate: 3600 }
  );

  let results = await getCachedModels();

  // Search by model name or tagline (case-insensitive)
  if (params.search) {
    const q = params.search.toLowerCase().trim();
    results = results.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q)
    );
  }

  // Filter by body type
  if (params.bodyType && params.bodyType !== "all") {
    results = results.filter((m) => m.body_type === params.bodyType);
  }

  // Filter by available fuel type across variants
  if (params.fuel && params.fuel !== "all") {
    results = results.filter((m) =>
      m.variants?.some((v) => v.fuel === params.fuel)
    );
  }

  // Filter by maximum budget
  if (params.maxPrice !== undefined) {
    results = results.filter(
      (m) => (m.min_price ?? 0) <= params.maxPrice!
    );
  }

  return results;
}

/**
 * Fetch a single active model by slug with its full variants and colors.
 * Cached with tag 'models' and 'model:<slug>'.
 */
export async function getModelBySlug(
  slug: string
): Promise<Model | null> {
  const getCachedModel = cachedQuery(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("models")
        .select(MODEL_COLUMNS)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch model "${slug}": ${error.message}`);
      }

      if (!data) return null;

      const model: Model = {
        id: data.id,
        slug: data.slug,
        name: data.name,
        body_type: data.body_type as BodyType,
        tagline: data.tagline,
        hero_image: data.hero_image,
        gallery: Array.isArray(data.gallery) ? (data.gallery as string[]) : [],
        is_active: data.is_active,
        is_featured: data.is_featured,
        created_at: data.created_at,
      };

      const variants = await listVariantsByModel(model.id);
      return enrichModel(model, variants);
    },
    ["models", "slug", slug],
    { tags: ["models", `model:${slug}`], revalidate: 3600 }
  );

  return getCachedModel();
}

/**
 * Fetch featured models for hero / carousel views.
 */
export async function getFeaturedModels(limit: number = 4): Promise<Model[]> {
  const all = await listModels();
  return all.slice(0, limit);
}
