import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Variant } from "@/types/domain";

export async function listVariantsByModel(modelId: string): Promise<Variant[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return memoryStore.variants.filter((v) => v.model_id === modelId);
  }
  // TODO(day-3): Implement Supabase query
  throw new Error("TODO(day-3): Supabase listVariantsByModel query not implemented yet");
}

export async function getVariantById(id: string): Promise<Variant | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return memoryStore.variants.find((v) => v.id === id) ?? null;
  }
  // TODO(day-3): Implement Supabase query
  throw new Error("TODO(day-3): Supabase getVariantById query not implemented yet");
}
