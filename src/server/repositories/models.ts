import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Model } from "@/types/domain";

export interface ListModelsParams {
  bodyType?: string;
  fuel?: string;
  maxPrice?: number;
  search?: string;
}

export async function listModels(params: ListModelsParams = {}): Promise<Model[]> {
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

    if (params.maxPrice) {
      results = results.filter(
        (m) => (m.min_price ?? 0) <= (params.maxPrice ?? Infinity)
      );
    }

    return results;
  }

  // TODO(day-3): Implement Supabase database query for models
  throw new Error("TODO(day-3): Supabase listModels query not implemented yet");
}

export async function getModelBySlug(slug: string): Promise<Model | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const model = memoryStore.models.find((m) => m.slug === slug);
    if (!model) return null;

    // Attach full variants
    const variants = memoryStore.variants.filter((v) => v.model_id === model.id);
    return {
      ...model,
      variants,
    };
  }

  // TODO(day-3): Implement Supabase database query for getModelBySlug
  throw new Error("TODO(day-3): Supabase getModelBySlug query not implemented yet");
}

