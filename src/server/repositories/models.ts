
import { env } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { memoryStore } from "@/server/store";
import { Model, Variant } from "@/types/domain";

export interface ListModelsParams {
  bodyType?: string;
  fuel?: string;
  maxPrice?: number;
  search?: string;
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
async function fetchVariants(modelIds: string[]): Promise<Variant[]> {
  if (modelIds.length === 0) return [];

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("variants")
    .select("*")
    .in("model_id", modelIds)
    .order("ex_showroom", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch model variants: ${error.message}`);
  }

  return (data ?? []) as Variant[];
}

/**
 * List active car models with their variants.
 * Supports search, body type, fuel and price filtering.
 */
export async function listModels(
  params: ListModelsParams = {}
): Promise<Model[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    let results = memoryStore.models.filter((m) => m.is_active);

    if (params.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.tagline.toLowerCase().includes(q)
      );
    }

    if (params.bodyType && params.bodyType !== "all") {
      results = results.filter((m) => m.body_type === params.bodyType);
    }

    if (params.fuel && params.fuel !== "all") {
      results = results.filter((m) =>
        m.variants?.some((v) => v.fuel === params.fuel)
      );
    }

    if (params.maxPrice !== undefined) {
      results = results.filter(
        (m) => (m.min_price ?? 0) <= params.maxPrice!
      );
    }

    return results;
  }

  const supabase = createPublicClient();

  // Fetch active models.
  const { data: modelData, error: modelError } = await supabase
    .from("models")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (modelError) {
    throw new Error(`Failed to fetch models: ${modelError.message}`);
  }

  const models = (modelData ?? []) as Model[];

  if (models.length === 0) return [];

  // Fetch variants for all returned models.
  const variants = await fetchVariants(models.map((model) => model.id));

  // Attach variants and calculate price ranges.
  let results = models.map((model) => enrichModel(model, variants));

  // Search by model name or tagline.
  if (params.search) {
    const q = params.search.toLowerCase();

    results = results.filter(
      (model) =>
        model.name.toLowerCase().includes(q) ||
        model.tagline.toLowerCase().includes(q)
    );
  }

  // Filter by body type.
  if (params.bodyType && params.bodyType !== "all") {
    results = results.filter(
      (model) => model.body_type === params.bodyType
    );
  }

  // Filter by available fuel type.
  if (params.fuel && params.fuel !== "all") {
    results = results.filter((model) =>
      model.variants?.some((variant) => variant.fuel === params.fuel)
    );
  }

  // Match existing mock-mode semantics:
  // Include models whose minimum ex-showroom price is within the limit.
  if (params.maxPrice !== undefined) {
    results = results.filter(
      (model) => (model.min_price ?? 0) <= params.maxPrice!
    );
  }

  return results;
}

/**
 * Fetch a single active model by slug with its variants.
 */
export async function getModelBySlug(
  slug: string
): Promise<Model | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const model = memoryStore.models.find(
      (m) => m.slug === slug && m.is_active
    );

    if (!model) return null;

    const variants = memoryStore.variants.filter(
      (variant) => variant.model_id === model.id
    );

    return enrichModel(model, variants);
  }

  const supabase = createPublicClient();

  const { data: modelData, error: modelError } = await supabase
    .from("models")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (modelError) {
    throw new Error(`Failed to fetch model "${slug}": ${modelError.message}`);
  }

  if (!modelData) return null;

  const model = modelData as Model;

  const variants = await fetchVariants([model.id]);

  return enrichModel(model, variants);
}
