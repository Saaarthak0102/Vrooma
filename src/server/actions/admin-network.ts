"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/viewer";
import { safeRevalidatePath } from "@/server/cache";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";

/**
 * Lead routing rules. `create_lead` reads these tables: it picks the consultants of the matching rule
 * (by showroom, optionally by model) and falls back to least-loaded staff of the showroom.
 * Admin only; every change is covered by the audit trigger on assignment_rules.
 */
export async function saveRoutingRuleAction(payload: {
  id?: string;
  showroom_id: string;
  model_id?: string | null;
  priority?: number;
  is_active?: boolean;
  consultant_ids: string[];
}): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireRole("admin");
    const admin = createAdminClient();

    if (!payload.showroom_id) return errorResponse("VALIDATION_FAILED", "Choose a showroom.");
    const consultantIds = [...new Set(payload.consultant_ids ?? [])];
    if (consultantIds.length === 0) return errorResponse("VALIDATION_FAILED", "Choose at least one consultant.");
    const priority = payload.priority ?? 1;
    if (!Number.isInteger(priority) || priority < 1 || priority > 100) {
      return errorResponse("VALIDATION_FAILED", "Priority must be a whole number from 1 to 100.");
    }

    // Only active consultants who actually work at that showroom may sit in its pool.
    const { data: eligible, error: eligibleErr } = await admin
      .from("staff_showrooms")
      .select("profile_id, profiles:profile_id ( role, is_active )")
      .eq("showroom_id", payload.showroom_id)
      .in("profile_id", consultantIds);
    if (eligibleErr) return errorResponse("INTERNAL_ERROR", eligibleErr.message);

    const okIds = new Set(
      (eligible ?? [])
        .filter((r: any) => r.profiles?.is_active !== false && r.profiles?.role === "consultant")
        .map((r: any) => r.profile_id as string)
    );
    const rejected = consultantIds.filter((id) => !okIds.has(id));
    if (rejected.length > 0) {
      return errorResponse(
        "VALIDATION_FAILED",
        "Every consultant in a pool must be active and assigned to that showroom."
      );
    }

    const row = {
      showroom_id: payload.showroom_id,
      model_id: payload.model_id || null,
      priority,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    let ruleId = payload.id;
    if (ruleId) {
      const { error } = await admin.from("assignment_rules").update(row).eq("id", ruleId);
      if (error) return errorResponse("INTERNAL_ERROR", error.message);
    } else {
      const { data, error } = await admin.from("assignment_rules").insert(row).select("id").single();
      if (error) return errorResponse("INTERNAL_ERROR", error.message);
      ruleId = data.id;
    }

    // Replace the pool.
    const { error: clearErr } = await admin.from("assignment_rule_consultants").delete().eq("rule_id", ruleId!);
    if (clearErr) return errorResponse("INTERNAL_ERROR", clearErr.message);
    const { error: poolErr } = await admin
      .from("assignment_rule_consultants")
      .insert(
        consultantIds.map((consultant_id) => ({
          rule_id: ruleId!,
          consultant_id,
          created_at: new Date().toISOString(),
        }))
      );
    if (poolErr) return errorResponse("INTERNAL_ERROR", poolErr.message);

    safeRevalidatePath("/admin/team");
    return successResponse({ id: ruleId! });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not save the routing rule.");
  }
}

export async function deleteRoutingRuleAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    await requireRole("admin");
    const admin = createAdminClient();
    const { error } = await admin.from("assignment_rules").delete().eq("id", id);
    if (error) return errorResponse("INTERNAL_ERROR", error.message);
    safeRevalidatePath("/admin/team");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not delete the routing rule.");
  }
}

/**
 * Workshop bay capacity. generate_slots uses ON CONFLICT DO NOTHING, so slots that already exist would keep their
 * old capacity. This therefore also re-sizes the workshop's FUTURE service slots, but only those whose existing
 * bookings still fit (booked_count <= bays), so nobody's confirmed booking is ever squeezed out.
 */
export async function updateWorkshopBaysAction(
  workshopId: string,
  bays: number
): Promise<ActionResponse<{ slotsUpdated: number }>> {
  try {
    await requireRole("admin");
    if (!Number.isInteger(bays) || bays < 1 || bays > 50) {
      return errorResponse("VALIDATION_FAILED", "Bays must be a whole number from 1 to 50.");
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("workshops")
      .update({ bays, updated_at: new Date().toISOString() })
      .eq("id", workshopId);
    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    const { data: resized, error: slotErr } = await admin
      .from("slots")
      .update({ capacity: bays })
      .eq("workshop_id", workshopId)
      .eq("kind", "service")
      .gt("starts_at", new Date().toISOString())
      .lte("booked_count", bays)
      .select("id");
    if (slotErr) return errorResponse("INTERNAL_ERROR", slotErr.message);

    safeRevalidatePath("/admin/team");
    safeRevalidatePath("/staff/bookings");
    return successResponse({ slotsUpdated: resized?.length ?? 0 });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not update the bays.");
  }
}

/** Switch an account on or off. A deactivated account is signed out and blocked by middleware. */
export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin");
    if (userId === profile.id && !active) {
      return errorResponse("FORBIDDEN", "You cannot deactivate your own account.");
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return errorResponse("INTERNAL_ERROR", error.message);
    safeRevalidatePath("/admin/team");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not update the account.");
  }
}

/* ------------------------------ network: create showrooms, workshops, demo cars ------------------------------ */

const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

/** Add a showroom. Slots, routing rules and demo cars are attached afterwards from the other tabs. */
export async function createShowroomAction(input: {
  cityId: string;
  name: string;
  address: string;
  phone: string;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireRole("admin");
    const name = cleanText(input?.name, 80);
    const address = cleanText(input?.address, 200);
    const phone = cleanText(input?.phone, 20);
    if (name.length < 3) return errorResponse("VALIDATION_FAILED", "Enter the showroom name (at least 3 characters).");
    if (address.length < 5) return errorResponse("VALIDATION_FAILED", "Enter the full address.");
    if (!PHONE_RE.test(phone)) return errorResponse("VALIDATION_FAILED", "Enter a valid phone number.");
    if (!input?.cityId) return errorResponse("VALIDATION_FAILED", "Choose a city.");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("showrooms")
      // lat/lng are nullable in the database (map pins are optional); the generated types predate that.
      .insert({ city_id: input.cityId, name, address, phone, is_active: true } as never)
      .select("id")
      .single();
    if (error || !data) return errorResponse("INTERNAL_ERROR", "Could not add the showroom. Check the city and try again.");

    safeRevalidatePath("/admin/team");
    safeRevalidatePath("/showrooms");
    return successResponse({ id: data.id });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not add the showroom.");
  }
}

/** Add a service workshop with its bay capacity (the capacity behind service booking). */
export async function createWorkshopAction(input: {
  cityId: string;
  name: string;
  address: string;
  phone: string;
  bays: number;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireRole("admin");
    const name = cleanText(input?.name, 80);
    const address = cleanText(input?.address, 200);
    const phone = cleanText(input?.phone, 20);
    const bays = Number(input?.bays);
    if (name.length < 3) return errorResponse("VALIDATION_FAILED", "Enter the workshop name (at least 3 characters).");
    if (address.length < 5) return errorResponse("VALIDATION_FAILED", "Enter the full address.");
    if (!PHONE_RE.test(phone)) return errorResponse("VALIDATION_FAILED", "Enter a valid phone number.");
    if (!Number.isInteger(bays) || bays < 1 || bays > 50) return errorResponse("VALIDATION_FAILED", "Bays must be a whole number from 1 to 50.");
    if (!input?.cityId) return errorResponse("VALIDATION_FAILED", "Choose a city.");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("workshops")
      .insert({ city_id: input.cityId, name, address, phone, bays, is_active: true })
      .select("id")
      .single();
    if (error || !data) return errorResponse("INTERNAL_ERROR", "Could not add the workshop. Check the city and try again.");

    safeRevalidatePath("/admin/team");
    safeRevalidatePath("/showrooms");
    safeRevalidatePath("/book/service");
    return successResponse({ id: data.id });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not add the workshop.");
  }
}

/** Add a demo car for a showroom (what buyers pick when booking a test drive). */
export async function createDemoCarAction(input: {
  showroomId: string;
  variantId: string;
  regLabel: string;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireRole("admin");
    const regLabel = cleanText(input?.regLabel, 40);
    if (regLabel.length < 3) return errorResponse("VALIDATION_FAILED", "Enter a plate label, for example UP32 ** 1234.");
    if (!input?.showroomId || !input?.variantId) return errorResponse("VALIDATION_FAILED", "Choose a showroom and a variant.");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("demo_cars")
      .insert({ showroom_id: input.showroomId, variant_id: input.variantId, reg_label: regLabel, is_active: true })
      .select("id")
      .single();
    if (error || !data) return errorResponse("INTERNAL_ERROR", "Could not add the demo car. Check the showroom and variant.");

    safeRevalidatePath("/admin/team");
    safeRevalidatePath("/book/test-drive");
    return successResponse({ id: data.id });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not add the demo car.");
  }
}
