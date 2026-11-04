import { createPublicClient } from "@/lib/supabase/public";
import { Slot, DemoCar, BookingKind } from "@/types/domain";
import { AppError } from "@/lib/errors";

export interface ListSlotsParams {
  kind?: "test_drive" | "service";
  showroomId?: string;
  workshopId?: string;
  demoCarId?: string;
  date?: string; // YYYY-MM-DD
  limit?: number;
}

const SLOT_COLUMNS = "id, kind, showroom_id, workshop_id, demo_car_id, starts_at, ends_at, capacity, booked_count, is_active";

/**
 * List active future slots for test drives or service workshop bays.
 */
export async function listSlots(params: ListSlotsParams = {}): Promise<Slot[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("slots")
    .select(SLOT_COLUMNS)
    .eq("is_active", true);

  if (params.kind) {
    query = query.eq("kind", params.kind);
  }
  if (params.showroomId) {
    query = query.eq("showroom_id", params.showroomId);
  }
  if (params.workshopId) {
    query = query.eq("workshop_id", params.workshopId);
  }
  if (params.demoCarId) {
    query = query.eq("demo_car_id", params.demoCarId);
  }
  if (params.date) {
    query = query
      .gte("starts_at", `${params.date}T00:00:00.000Z`)
      .lte("starts_at", `${params.date}T23:59:59.999Z`);
  }

  const limit = Math.min(params.limit || 100, 200);
  const { data, error } = await query
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch slots: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as BookingKind,
    showroom_id: row.showroom_id,
    workshop_id: row.workshop_id,
    demo_car_id: row.demo_car_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    capacity: row.capacity,
    booked_count: row.booked_count,
  }));
}

/**
 * List active demo cars available for test drive bookings.
 */
export async function listDemoCars(showroomId?: string): Promise<DemoCar[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("demo_cars")
    .select(`
      id,
      showroom_id,
      variant_id,
      reg_label,
      is_active,
      variants (
        name
      )
    `)
    .eq("is_active", true);

  if (showroomId) {
    query = query.eq("showroom_id", showroomId);
  }

  const { data, error } = await query
    .order("reg_label", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch demo cars: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    showroom_id: row.showroom_id,
    variant_id: row.variant_id,
    variant_name: row.variants?.name || "Demo Vehicle",
    reg_label: row.reg_label,
    active: row.is_active,
  }));
}
