import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isPlausibleReg, normaliseReg, suggestNextService, type ServiceVisitInput, type VehicleSummary } from "@/lib/garage";
import { maskRegNo } from "@/lib/masking";
import { istDateString } from "@/lib/ist-format";

// owner_vehicles / service_records are newer than the generated Supabase types, so these queries are loosely typed.
const db = (): any => createAdminClient();

/** A buyer's cars with their last and next service. Registration numbers are masked: never the private value. */
export async function loadVehicleSummaries(userId: string): Promise<VehicleSummary[]> {
  const admin = db();
  const { data: vehicles, error } = await admin
    .from("owner_vehicles")
    .select("id, reg_masked, model_name, variant_name, odometer_km, insurance_expiry, puc_expiry, warranty_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`garage query failed: ${error.message}`);
  if (!vehicles?.length) return [];

  const { data: records } = await admin
    .from("service_records")
    .select("vehicle_id, serviced_on, odometer_km, next_due_on, next_due_km")
    .in("vehicle_id", vehicles.map((v: any) => v.id))
    .order("serviced_on", { ascending: false });
  const latest = new Map<string, any>();
  for (const r of records ?? []) if (!latest.has(r.vehicle_id)) latest.set(r.vehicle_id, r);

  return vehicles.map((v: any) => {
    const r = latest.get(v.id);
    return {
      id: v.id,
      regMasked: v.reg_masked,
      modelName: v.model_name,
      variantName: v.variant_name,
      odometerKm: v.odometer_km,
      insuranceExpiry: v.insurance_expiry,
      pucExpiry: v.puc_expiry,
      warrantyEnd: v.warranty_end,
      lastService: r ? { servicedOn: r.serviced_on, odometerKm: r.odometer_km } : null,
      nextService: r && (r.next_due_on || r.next_due_km) ? { dueOn: r.next_due_on, dueKm: r.next_due_km } : null,
    } satisfies VehicleSummary;
  });
}

/** Has this owner ticked "send me service and insurance reminders" (the latest service_contact consent)? */
export async function remindersConsented(userId: string): Promise<boolean> {
  const { data } = await db()
    .from("current_consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("purpose", "service_contact")
    .maybeSingle();
  return data?.granted === true;
}

export type ServiceVisitOutcome =
  | { recorded: true; vehicleId: string; createdVehicle: boolean }
  | { recorded: false; reason: string };

/**
 * Staff marked a service booking as attended and entered the odometer / next due date. Adds it to the buyer's
 * history, creating the car in their garage from the booking if it is not there yet (matched by registration
 * number). Safe to call twice for the same booking: one record per booking.
 */
export async function recordServiceVisit(params: {
  booking: { id: string; user_id: string | null; kind: string; vehicle_info: any; servicedAt: string };
  visit: ServiceVisitInput;
  staffId: string;
}): Promise<ServiceVisitOutcome> {
  const { booking, visit, staffId } = params;
  if (booking.kind !== "service") return { recorded: false, reason: "Not a service booking." };
  if (!booking.user_id) return { recorded: false, reason: "The booking has no account to attach the history to." };

  const reg = normaliseReg(booking.vehicle_info?.reg_no);
  if (!isPlausibleReg(reg)) return { recorded: false, reason: "The booking has no valid registration number." };

  const admin = db();
  let vehicleId: string | null = null;
  let createdVehicle = false;

  const { data: existing } = await admin
    .from("owner_vehicles")
    .select("id, odometer_km")
    .eq("user_id", booking.user_id)
    .eq("reg_no_private", reg)
    .maybeSingle();

  if (existing) {
    vehicleId = existing.id;
  } else {
    const { data: created, error } = await admin
      .from("owner_vehicles")
      .insert({
        user_id: booking.user_id,
        reg_no_private: reg,
        reg_masked: maskRegNo(reg),
        model_name: String(booking.vehicle_info?.model_name || "My car").slice(0, 80),
        variant_name: booking.vehicle_info?.variant_name ? String(booking.vehicle_info.variant_name).slice(0, 80) : null,
        odometer_km: visit.odometerKm,
      })
      .select("id")
      .single();
    if (error || !created) return { recorded: false, reason: error?.message ?? "Could not add the car to the garage." };
    vehicleId = created.id;
    createdVehicle = true;
  }

  const servicedOn = istDateString(new Date(booking.servicedAt));
  const fallback = suggestNextService(servicedOn, visit.odometerKm);
  const { error: recErr } = await admin.from("service_records").upsert(
    {
      vehicle_id: vehicleId,
      booking_id: booking.id,
      serviced_on: servicedOn,
      odometer_km: visit.odometerKm,
      summary: visit.summary ?? null,
      next_due_on: visit.nextDueOn ?? fallback.nextDueOn,
      next_due_km: visit.nextDueKm ?? fallback.nextDueKm,
      created_by: staffId,
    },
    { onConflict: "booking_id" },
  );
  if (recErr) return { recorded: false, reason: recErr.message };

  // Keep the car's odometer moving forward only.
  if (!createdVehicle && (existing?.odometer_km ?? 0) < visit.odometerKm) {
    await admin.from("owner_vehicles").update({ odometer_km: visit.odometerKm }).eq("id", vehicleId);
  }
  return { recorded: true, vehicleId: vehicleId!, createdVehicle };
}
