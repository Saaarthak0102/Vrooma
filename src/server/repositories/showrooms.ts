import { createPublicClient } from "@/lib/supabase/public";
import { Showroom, Workshop } from "@/types/domain";
import { cachedQuery } from "@/server/cache";
import { AppError } from "@/lib/errors";

const SHOWROOM_COLUMNS = "id, city_id, name, address, phone, hours, lat, lng, is_active";
const WORKSHOP_COLUMNS = "id, city_id, name, address, phone, bays, hours, is_active";

/**
 * List active showrooms, optionally filtered by city ID.
 * Cached with tag 'showrooms'.
 */
export async function listShowrooms(cityId?: string): Promise<Showroom[]> {
  const cachedFn = cachedQuery(
    async () => {
      const supabase = createPublicClient();
      let query = supabase
        .from("showrooms")
        .select(SHOWROOM_COLUMNS)
        .eq("is_active", true);

      if (cityId) {
        query = query.eq("city_id", cityId);
      }

      const { data, error } = await query
        .order("name", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch showrooms: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        city_id: row.city_id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        hours: (row.hours as Record<string, string>) || {},
        lat: Number(row.lat),
        lng: Number(row.lng),
        is_active: row.is_active,
      }));
    },
    ["showrooms", cityId || "all"],
    { tags: ["showrooms"], revalidate: 3600 }
  );

  return cachedFn();
}

/**
 * List active workshops, optionally filtered by city ID.
 * Cached with tag 'workshops'.
 */
export async function listWorkshops(cityId?: string): Promise<Workshop[]> {
  const cachedFn = cachedQuery(
    async () => {
      const supabase = createPublicClient();
      let query = supabase
        .from("workshops")
        .select(WORKSHOP_COLUMNS)
        .eq("is_active", true);

      if (cityId) {
        query = query.eq("city_id", cityId);
      }

      const { data, error } = await query
        .order("name", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch workshops: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        city_id: row.city_id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        bays: row.bays,
        hours: (row.hours as Record<string, string>) || {},
        is_active: row.is_active,
      }));
    },
    ["workshops", cityId || "all"],
    { tags: ["workshops"], revalidate: 3600 }
  );

  return cachedFn();
}
