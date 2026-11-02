import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Showroom, Workshop } from "@/types/domain";

export async function listShowrooms(cityId?: string): Promise<Showroom[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    if (cityId) {
      return memoryStore.showrooms.filter((s) => s.city_id === cityId);
    }
    return [...memoryStore.showrooms];
  }
  throw new Error("TODO(day-3): Supabase listShowrooms not implemented yet");
}

export async function listWorkshops(cityId?: string): Promise<Workshop[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    if (cityId) {
      return memoryStore.workshops.filter((w) => w.city_id === cityId);
    }
    return [...memoryStore.workshops];
  }
  throw new Error("TODO(day-3): Supabase listWorkshops not implemented yet");
}
