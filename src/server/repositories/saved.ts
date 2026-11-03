import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Model, UsedCar } from "@/types/domain";

export type SavedItemType = "model" | "used";

export interface SavedVehicleRecord {
  id: string;
  type: SavedItemType;
  item: Model | UsedCar;
}

/**
 * Returns all saved vehicles for the buyer, resolving both new models and certified used cars.
 * Guarantees that the overview counter and the rendered vehicle cards always match 1:1.
 */
export async function listSavedVehicles(_userId?: string): Promise<SavedVehicleRecord[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const records: SavedVehicleRecord[] = [];
    const savedIds = Array.from(memoryStore.savedCarIds);

    for (const id of savedIds) {
      const lower = id.toLowerCase();
      // Check if it's a new car model
      const model = memoryStore.models.find(
        (m) => m.id.toLowerCase() === lower || m.slug.toLowerCase() === lower
      );
      if (model) {
        records.push({ id, type: "model", item: model });
        continue;
      }

      // Check if it's a certified pre-owned vehicle
      const used = memoryStore.usedCars.find(
        (u) => u.id.toLowerCase() === lower || u.stock_id.toLowerCase() === lower
      );
      if (used) {
        records.push({ id, type: "used", item: used });
      }
    }

    return records;
  }

  throw new Error("TODO(day-4): Supabase listSavedVehicles not implemented yet");
}

/**
 * Removes a vehicle from the buyer's saved collection.
 */
export async function removeSavedVehicle(id: string): Promise<boolean> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const lower = id.toLowerCase();
    for (const item of Array.from(memoryStore.savedCarIds)) {
      if (item.toLowerCase() === lower) {
        memoryStore.savedCarIds.delete(item);
        return true;
      }
    }
    return false;
  }
  throw new Error("TODO(day-4): Supabase removeSavedVehicle not implemented yet");
}

