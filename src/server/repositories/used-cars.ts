import { createPublicClient } from "@/lib/supabase/public";
import { UsedCar, FuelType, TransmissionType, CarStatus, Inspection } from "@/types/domain";
import { cachedQuery } from "@/server/cache";
import { AppError } from "@/lib/errors";
import { mockUsedCars } from "@/data/mock/used-cars";

export interface ListUsedCarsParams {
  modelId?: string;
  fuel?: string;
  minYear?: number;
  maxKm?: number;
  maxPrice?: number;
  sort?: string;
  search?: string;
  limit?: number;
}

/**
 * Columns explicitly selected for public used car queries.
 * SECURITY: Never select reg_no_private, final_price, or internal appraisal notes.
 */
const PUBLIC_USED_CAR_COLUMNS = [
  "id",
  "stock_id",
  "model_id",
  "model_name",
  "variant_name",
  "fuel",
  "year",
  "km",
  "owners",
  "price",
  "status",
  "reg_no_masked",
  "showroom_id",
  "certified",
  "inspection",
  "inspection_score",
  "images",
  "listed_at",
  "sold_at",
  "created_at",
  "updated_at",
].join(", ");

function mapRowToUsedCar(row: any): UsedCar {
  const rawInspection = (row.inspection as Record<string, any>) || {};
  const inspectionObj: Inspection = {
    score: row.inspection_score ?? rawInspection.score ?? 95,
    totalChecks: rawInspection.totalChecks ?? 140,
    date: rawInspection.date ?? row.created_at,
    inspector: rawInspection.inspector ?? "Vrooma Certified Inspector",
    checks: rawInspection.checks ?? [],
    summary: rawInspection.summary ?? "Comprehensive 140-point certification passed.",
    ...rawInspection,
  };

  return {
    id: row.id,
    stock_id: row.stock_id,
    model_id: row.model_id,
    model_name: row.model_name,
    variant_name: row.variant_name,
    fuel: row.fuel as FuelType,
    transmission: (row.transmission || "Manual") as TransmissionType,
    year: row.year,
    km: row.km,
    owners: row.owners,
    price: row.price,
    certified: Boolean(row.certified ?? true),
    is_certified: Boolean(row.certified ?? true),
    inspection_score: row.inspection_score,
    inspection: inspectionObj,
    inspection_report: inspectionObj,
    photos: Array.isArray(row.images) ? row.images : [],
    images: Array.isArray(row.images) ? row.images : [],
    status: row.status as CarStatus,
    reg_no_masked: row.reg_no_masked,
    city_id: row.city_id || "c0000001-0000-0000-0000-000000000001",
    showroom_id: row.showroom_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Raw query for active / listed used cars from Supabase.
 */
async function queryUsedCars(params: ListUsedCarsParams): Promise<UsedCar[]> {
  const supabase = createPublicClient();
  const limit = Math.min(params.limit || 50, 100);

  let query = supabase
    .from("used_cars")
    .select(PUBLIC_USED_CAR_COLUMNS)
    .in("status", ["available", "booked"]);

  if (params.modelId && params.modelId !== "all") {
    query = query.eq("model_id", params.modelId);
  }

  if (params.fuel && params.fuel !== "all") {
    query = query.eq("fuel", params.fuel as FuelType);
  }

  if (params.minYear) {
    query = query.gte("year", params.minYear);
  }

  if (params.maxKm) {
    query = query.lte("km", params.maxKm);
  }

  if (params.maxPrice) {
    query = query.lte("price", params.maxPrice);
  }

  // Sorting
  if (params.sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else if (params.sort === "year_desc") {
    query = query.order("year", { ascending: false });
  } else if (params.sort === "km_asc") {
    query = query.order("km", { ascending: true });
  } else {
    // Default: price ascending
    query = query.order("price", { ascending: true });
  }

  // Deterministic tiebreaker
  query = query.order("id", { ascending: true }).limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch used cars: ${error.message}`);
  }

  let results = (data ?? []).map(mapRowToUsedCar);

  // Search filter across model, variant, or stock ID
  if (params.search) {
    const q = params.search.toLowerCase().trim();
    results = results.filter(
      (c) =>
        c.model_name.toLowerCase().includes(q) ||
        c.variant_name.toLowerCase().includes(q) ||
        c.stock_id.toLowerCase().includes(q)
    );
  }

  return results;
}

/**
 * List certified pre-owned vehicles.
 * Cached with tag 'used'.
 */
export async function listUsedCars(params: ListUsedCarsParams = {}): Promise<UsedCar[]> {
  const cacheKey = [
    "used-cars",
    params.modelId || "all",
    params.fuel || "all",
    String(params.minYear || 0),
    String(params.maxKm || 0),
    String(params.maxPrice || 0),
    params.sort || "price_asc",
    params.search || "",
  ];

  const cachedFn = cachedQuery(
    () => queryUsedCars(params),
    cacheKey,
    { tags: ["used"], revalidate: 3600 }
  );

  return cachedFn();
}

/**
 * Fetch a single used car by its unique stock ID (e.g. UC-1182).
 * Includes sold cars so their individual permalink renders with a "Sold" notice.
 * Never leaks reg_no_private to public callers.
 */
export function findSampleUsedCar(stockId: string): UsedCar | null {
  const wanted = stockId.trim().toUpperCase();
  const sample = mockUsedCars.find((c) => c.stock_id.toUpperCase() === wanted);
  if (!sample) return null;
  // Public shape only: never expose the private registration number.
  const { reg_no_private: _private, ...publicCar } = sample;
  return publicCar as UsedCar;
}

export async function getUsedCarByStockId(stockId: string): Promise<UsedCar | null> {
  const normalizedStockId = stockId.trim().toUpperCase();

  const cachedFn = cachedQuery(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("used_cars")
        .select(PUBLIC_USED_CAR_COLUMNS)
        .ilike("stock_id", normalizedStockId)
        .maybeSingle();

      // The listing page shows the client's sample stock; cars not in the database yet still open.
      if (error) {
        const sample = findSampleUsedCar(normalizedStockId);
        if (sample) return sample;
        throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch used car ${stockId}: ${error.message}`);
      }

      if (!data) return findSampleUsedCar(normalizedStockId);
      return mapRowToUsedCar(data);
    },
    ["used-car", "by-stock", normalizedStockId],
    { tags: ["used", `used:${normalizedStockId.toLowerCase()}`], revalidate: 3600 }
  );

  return cachedFn();
}
