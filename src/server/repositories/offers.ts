import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Offer, Banner } from "@/types/domain";

export async function listOffers(): Promise<Offer[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return memoryStore.offers.filter(
      (o) => o.active && (!o.valid_until || o.valid_until >= todayStr)
    );
  }
  throw new Error("TODO(day-4): Supabase listOffers not implemented yet");
}

/**
 * Returns unique model IDs that have an active, unexpired offer.
 * Designed to be called once per page render.
 */
export async function listActiveOfferModelIds(today?: string): Promise<string[]> {
  const activeOffers = await listOffers();
  const todayStr = today || new Date().toISOString().slice(0, 10);
  const modelIds = new Set<string>();

  for (const offer of activeOffers) {
    if (
      offer.model_id &&
      offer.active &&
      (!offer.valid_until || offer.valid_until >= todayStr)
    ) {
      modelIds.add(offer.model_id);
    }
  }

  return Array.from(modelIds);
}

export async function listBanners(): Promise<Banner[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return memoryStore.banners
      .filter((b) => b.active)
      .sort((a, b) => a.sort - b.sort);
  }
  throw new Error("TODO(day-4): Supabase listBanners not implemented yet");
}

