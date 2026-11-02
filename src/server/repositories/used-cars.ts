import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { UsedCar } from "@/types/domain";

export interface ListUsedCarsParams {
  modelId?: string;
  fuel?: string;
  minYear?: number;
  maxKm?: number;
  maxPrice?: number;
  sort?: string;
  search?: string;
}

export async function listUsedCars(params: ListUsedCarsParams = {}): Promise<UsedCar[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    let results = [...memoryStore.usedCars];

    if (params.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.model_name.toLowerCase().includes(q) ||
          c.variant_name.toLowerCase().includes(q) ||
          c.stock_id.toLowerCase().includes(q)
      );
    }

    if (params.modelId && params.modelId !== "all") {
      results = results.filter((c) => c.model_id === params.modelId);
    }

    if (params.fuel && params.fuel !== "all") {
      results = results.filter((c) => c.fuel === params.fuel);
    }

    if (params.minYear) {
      results = results.filter((c) => c.year >= (params.minYear ?? 0));
    }

    if (params.maxKm) {
      results = results.filter((c) => c.km <= (params.maxKm ?? Infinity));
    }

    if (params.maxPrice) {
      results = results.filter((c) => c.price <= (params.maxPrice ?? Infinity));
    }

    if (params.sort === "price_desc") {
      results.sort((a, b) => b.price - a.price);
    } else if (params.sort === "year_desc") {
      results.sort((a, b) => b.year - a.year);
    } else if (params.sort === "km_asc") {
      results.sort((a, b) => a.km - b.km);
    } else {
      // Default: price low to high
      results.sort((a, b) => a.price - b.price);
    }

    // Public strip: never leak reg_no_private
    return results.map((c) => {
      const { reg_no_private, ...publicCar } = c;
      return publicCar as UsedCar;
    });
  }

  // TODO(day-3): Implement Supabase query
  throw new Error("TODO(day-3): Supabase listUsedCars query not implemented yet");
}

export async function getUsedCarByStockId(stockId: string): Promise<UsedCar | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const car = memoryStore.usedCars.find(
      (c) => c.stock_id.toLowerCase() === stockId.toLowerCase()
    );
    if (!car) return null;
    const { reg_no_private, ...publicCar } = car;
    return publicCar as UsedCar;
  }

  // TODO(day-3): Implement Supabase query
  throw new Error("TODO(day-3): Supabase getUsedCarByStockId query not implemented yet");
}

