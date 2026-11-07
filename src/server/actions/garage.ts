"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { MAX_VEHICLES_PER_USER, REMINDER_CONSENT_TEXT, vehicleInputSchema, type VehicleSummary } from "@/lib/garage";
import { maskRegNo } from "@/lib/masking";
import { recordConsent } from "@/server/privacy/consent";
import { loadVehicleSummaries, remindersConsented } from "@/server/services/garage";

const db = (): any => createAdminClient();

export interface MyGarage {
  vehicles: VehicleSummary[];
  remindersOn: boolean;
}

/** The signed-in buyer's own cars. Registration numbers are returned masked only. */
export async function getMyGarageAction(): Promise<ActionResponse<MyGarage>> {
  try {
    const { user } = await requireUser();
    const [vehicles, remindersOn] = await Promise.all([loadVehicleSummaries(user.id), remindersConsented(user.id)]);
    return successResponse({ vehicles, remindersOn });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") return errorResponse("UNAUTHORIZED", "Please sign in to see your cars.");
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not load your cars.");
  }
}

/**
 * Adds or updates one of the buyer's cars. `remindersConsent` is only recorded when the form sent it (an explicit,
 * unticked-by-default checkbox); omitting it leaves the existing choice untouched.
 */
export async function saveVehicleAction(
  input: unknown,
  remindersConsent?: boolean,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { user } = await requireUser();
    const parsed = vehicleInputSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Please check the car details.");
    }
    const v = parsed.data;
    const admin = db();

    const row = {
      user_id: user.id,
      reg_no_private: v.regNo,
      reg_masked: maskRegNo(v.regNo),
      model_name: v.modelName,
      variant_name: v.variantName ?? null,
      purchase_date: v.purchaseDate ?? null,
      bought_from_vrooma: v.boughtFromVrooma,
      odometer_km: v.odometerKm ?? null,
      insurance_expiry: v.insuranceExpiry ?? null,
      puc_expiry: v.pucExpiry ?? null,
      warranty_end: v.warrantyEnd ?? null,
    };

    let id: string;
    if (v.id) {
      const { data, error } = await admin.from("owner_vehicles").update(row).eq("id", v.id).eq("user_id", user.id).select("id").maybeSingle();
      if (error) {
        return errorResponse(error.code === "23505" ? "CONFLICT" : "INTERNAL_ERROR", error.code === "23505" ? "You already have a car with this registration number." : error.message);
      }
      if (!data) return errorResponse("NOT_FOUND", "Car not found.");
      id = data.id;
    } else {
      const { count } = await admin.from("owner_vehicles").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count ?? 0) >= MAX_VEHICLES_PER_USER) {
        return errorResponse("VALIDATION_FAILED", `You can keep up to ${MAX_VEHICLES_PER_USER} cars.`);
      }
      const { data, error } = await admin.from("owner_vehicles").insert(row).select("id").single();
      if (error) {
        return errorResponse(error.code === "23505" ? "CONFLICT" : "INTERNAL_ERROR", error.code === "23505" ? "You already have a car with this registration number." : error.message);
      }
      id = data.id;
    }

    if (typeof remindersConsent === "boolean") {
      await recordConsent({
        userId: user.id,
        email: user.email ?? null,
        purpose: "service_contact",
        granted: remindersConsent,
        source: "profile",
        consentText: REMINDER_CONSENT_TEXT,
      });
    }
    return successResponse({ id });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") return errorResponse("UNAUTHORIZED", "Please sign in.");
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not save the car.");
  }
}

export async function deleteVehicleAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const { user } = await requireUser();
    const { error } = await db().from("owner_vehicles").delete().eq("id", id).eq("user_id", user.id);
    if (error) return errorResponse("INTERNAL_ERROR", error.message);
    return successResponse({ id });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") return errorResponse("UNAUTHORIZED", "Please sign in.");
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not remove the car.");
  }
}

/** Switch service and insurance reminders on or off (appends a consent event; history is kept for the audit). */
export async function setReminderConsentAction(granted: boolean): Promise<ActionResponse<{ remindersOn: boolean }>> {
  try {
    const { user } = await requireUser();
    await recordConsent({
      userId: user.id,
      email: user.email ?? null,
      purpose: "service_contact",
      granted: Boolean(granted),
      source: "profile",
      consentText: REMINDER_CONSENT_TEXT,
    });
    return successResponse({ remindersOn: Boolean(granted) });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") return errorResponse("UNAUTHORIZED", "Please sign in.");
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not update your reminder choice.");
  }
}
