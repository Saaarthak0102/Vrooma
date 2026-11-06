import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { Booking, BookingKind, BookingStatus } from "@/types/domain";
import { AppError } from "@/lib/errors";

const BOOKING_QUERY = `
  id,
  user_id,
  slot_id,
  kind,
  status,
  vehicle_info,
  notes,
  address,
  pincode,
  created_at,
  slots:slot_id (
    starts_at,
    ends_at,
    showrooms:showroom_id (
      name
    ),
    workshops:workshop_id (
      name
    )
  )
`;

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return createPublicClient();
  }
}

function mapRowToBooking(row: any): Booking {
  const vInfo = typeof row.vehicle_info === "object" && row.vehicle_info !== null
    ? row.vehicle_info
    : { model_name: "Vehicle" };

  const showroomName =
    row.slots?.showrooms?.name ||
    row.slots?.workshops?.name ||
    "Hazratganj Flagship Showroom";

  return {
    id: row.id,
    user_id: row.user_id,
    slot_id: row.slot_id,
    kind: row.kind as BookingKind,
    status: row.status as BookingStatus,
    vehicle_info: {
      model_name: vInfo.model_name || "Vehicle",
      variant_name: vInfo.variant_name,
      reg_no: vInfo.reg_no || vInfo.reg_number,
    },
    showroom_or_workshop_name: showroomName,
    address: row.address ?? null,
    pincode: row.pincode ?? null,
    starts_at: row.slots?.starts_at || row.created_at,
    ends_at: row.slots?.ends_at || row.created_at,
    notes: row.notes || undefined,
    consultant_name: "Assigned Specialist",
    created_at: row.created_at,
  };
}

/**
 * List bookings, optionally filtered by user ID.
 */
export async function listBookings(userId?: string): Promise<Booking[]> {
  const supabase = getClient();
  let query = supabase
    .from("bookings")
    .select(BOOKING_QUERY);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to list bookings: ${error.message}`);
  }

  return (data ?? []).map(mapRowToBooking);
}

/**
 * Create a new test drive or workshop service booking.
 */
export async function createBooking(data: Omit<Booking, "id" | "created_at">): Promise<Booking> {
  const supabase = getClient();

  const insertPayload = {
    ref: data.ref || `BK-${Date.now().toString(36).toUpperCase()}`,
    user_id: data.user_id,
    slot_id: data.slot_id,
    kind: data.kind,
    status: data.status || "confirmed",
    vehicle_info: data.vehicle_info as any,
    notes: data.notes || null,
  };

  const { data: row, error } = await supabase
    .from("bookings")
    .insert(insertPayload)
    .select(BOOKING_QUERY)
    .single();

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to create booking: ${error.message}`);
  }

  return mapRowToBooking(row);
}
