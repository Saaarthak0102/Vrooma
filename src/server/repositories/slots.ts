import { createPublicClient } from "@/lib/supabase/public";
import { Slot, DemoCar, BookingKind } from "@/types/domain";
import { AppError } from "@/lib/errors";

export interface ListSlotsParams {
  kind?: "test_drive" | "service";
  showroomId?: string;
  workshopId?: string;
  demoCarId?: string;
  date?: string; // YYYY-MM-DD in Asia/Kolkata
  includePast?: boolean;
  limit?: number;
}

const SLOT_COLUMNS = "id, kind, showroom_id, workshop_id, demo_car_id, starts_at, ends_at, capacity, booked_count, is_active";

/**
 * Converts an IST date string (YYYY-MM-DD) to UTC ISO boundaries.
 * IST is UTC+05:30.
 */
export function getISTDayRangeUTC(dateStr: string): { startUTC: string; endUTC: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - istOffsetMs);
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - istOffsetMs);
  return {
    startUTC: start.toISOString(),
    endUTC: end.toISOString(),
  };
}

/**
 * List active future slots for test drives or service workshop bays.
 * Enforces IST day queries and 2-hour minimum advance lead time.
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

  // 2-hour minimum advance booking lead-time cutoff
  if (!params.includePast) {
    const minLeadTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    query = query.gt("starts_at", minLeadTime);
  }

  if (params.date) {
    const { startUTC, endUTC } = getISTDayRangeUTC(params.date);
    query = query
      .gte("starts_at", startUTC)
      .lte("starts_at", endUTC);
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
