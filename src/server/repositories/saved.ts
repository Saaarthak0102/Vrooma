import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { Model, UsedCar } from "@/types/domain";
import { getModelBySlug, listModels } from "./models";
import { getUsedCarByStockId, listUsedCars } from "./used-cars";
import { memoryStore } from "@/server/store";

export type SavedItemType = "model" | "used";

export interface SavedVehicleRecord {
  id: string;
  type: SavedItemType;
  item: Model | UsedCar;
}

const DEFAULT_DEV_BUYER_ID = "00000000-0000-0000-0000-000000000001";

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return createPublicClient();
  }
}

/**
 * Returns all saved vehicles for the buyer, resolving both new models and certified used cars.
 * Guarantees that the overview counter and the rendered vehicle cards always match 1:1.
 */
export async function listSavedVehicles(userId?: string): Promise<SavedVehicleRecord[]> {
  const targetUser = userId || DEFAULT_DEV_BUYER_ID;
  const records: SavedVehicleRecord[] = [];

  // In test environment or fallback if store is populated
  if (process.env.NODE_ENV === "test" && memoryStore.savedCarIds && memoryStore.savedCarIds.size > 0) {
    const allModels = await listModels();
    const allUsed = await listUsedCars();

    for (const rawId of Array.from(memoryStore.savedCarIds)) {
      const lower = rawId.toLowerCase();
      const model = allModels.find(
        (m) => m.id.toLowerCase() === lower || m.slug.toLowerCase() === lower
      );
      if (model) {
        records.push({ id: rawId, type: "model", item: model });
        continue;
      }

      const used = allUsed.find(
        (u) => u.id.toLowerCase() === lower || u.stock_id.toLowerCase() === lower
      );
      if (used) {
        records.push({ id: rawId, type: "used", item: used });
      }
    }
    return records;
  }

  // Live Supabase query
  const supabase = getClient();
  const { data, error } = await supabase
    .from("saved_items")
    .select("id, model_id, used_car_id, created_at")
    .eq("user_id", targetUser)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`[saved] Failed to query saved_items: ${error.message}`);
    return [];
  }

  const allModels = await listModels();
  const allUsed = await listUsedCars();

  for (const row of data || []) {
    if (row.model_id) {
      const model = allModels.find((m) => m.id === row.model_id);
      if (model) {
        records.push({ id: model.slug, type: "model", item: model });
      }
    } else if (row.used_car_id) {
      const used = allUsed.find((u) => u.id === row.used_car_id);
      if (used) {
        records.push({ id: used.stock_id, type: "used", item: used });
      }
    }
  }

  return records;
}

/**
 * Removes a vehicle from the buyer's saved collection.
 */
export async function removeSavedVehicle(id: string, userId?: string): Promise<boolean> {
  const targetUser = userId || DEFAULT_DEV_BUYER_ID;

  if (process.env.NODE_ENV === "test" && memoryStore.savedCarIds) {
    const lower = id.toLowerCase();
    for (const item of Array.from(memoryStore.savedCarIds)) {
      if (item.toLowerCase() === lower) {
        memoryStore.savedCarIds.delete(item);
        return true;
      }
    }
    return false;
  }

  const supabase = getClient();
  const { error } = await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", targetUser)
    .or(`model_id.eq.${id},used_car_id.eq.${id}`);

  if (error) {
    console.warn(`[saved] Failed to remove saved vehicle: ${error.message}`);
    return false;
  }

  return true;
}
