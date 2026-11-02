import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Offer, Banner } from "@/types/domain";

export async function listOffers(): Promise<Offer[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return memoryStore.offers.filter((o) => o.active);
  }
  throw new Error("TODO(day-4): Supabase listOffers not implemented yet");
}

export async function listBanners(): Promise<Banner[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return memoryStore.banners
      .filter((b) => b.active)
      .sort((a, b) => a.sort - b.sort);
  }
  throw new Error("TODO(day-4): Supabase listBanners not implemented yet");
}

