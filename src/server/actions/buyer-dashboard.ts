"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { Booking, Lead, Model, UsedCar } from "@/types/domain";
import { SavedVehicleRecord } from "@/server/repositories/saved";
import { listModels } from "@/server/repositories/models";
import { listUsedCars } from "@/server/repositories/used-cars";

export interface BuyerDashboardData {
  upcomingBookings: Booking[];
  pastBookings: Booking[];
  savedVehicles: SavedVehicleRecord[];
  enquiries: Array<{
    id: string;
    ref: string;
    vehicleName: string;
    status: string;
    statusLabel: string;
    createdAt: string;
  }>;
  counts: {
    bookings: number;
    saved: number;
    enquiries: number;
  };
}

function getBuyerStatusLabel(status: string): string {
  switch (status) {
    case "new":
      return "Enquiry Received";
    case "contacted":
      return "Specialist Contacted";
    case "test_drive_booked":
      return "Test Drive Scheduled";
    case "negotiating":
      return "Offer in Progress";
    case "won":
      return "Delivered & Closed";
    case "lost":
      return "Closed";
    default:
      return "In Review";
  }
}

/**
 * Loads all real, per-user dashboard data in a single coordinated server action.
 */
export async function getBuyerDashboardDataAction(): Promise<ActionResponse<BuyerDashboardData>> {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();
    const nowISO = new Date().toISOString();

    // 1. Fetch User Bookings (joined with slots, facilities, profiles)
    const { data: bookingRows, error: bookingErr } = await admin
      .from("bookings")
      .select(`
        id,
        ref,
        user_id,
        slot_id,
        kind,
        status,
        vehicle_info,
        notes,
        created_at,
        slots:slot_id (
          starts_at,
          ends_at,
          showrooms:showroom_id ( name ),
          workshops:workshop_id ( name )
        ),
        profiles:user_id ( full_name )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bookingErr) {
      console.warn(`[dashboard] Failed to load bookings: ${bookingErr.message}`);
    }

    const allBookings: Booking[] = (bookingRows || []).map((row: any) => {
      const vInfo = typeof row.vehicle_info === "object" && row.vehicle_info !== null
        ? row.vehicle_info
        : { model_name: "Vehicle" };

      const facilityName =
        row.slots?.showrooms?.name ||
        row.slots?.workshops?.name ||
        "Hazratganj Flagship Showroom";

      return {
        id: row.id,
        ref: row.ref,
        user_id: row.user_id,
        slot_id: row.slot_id,
        kind: row.kind,
        status: row.status,
        vehicle_info: {
          model_name: vInfo.model_name || "Vehicle",
          variant_name: vInfo.variant_name,
          reg_no: vInfo.reg_no,
        },
        showroom_or_workshop_name: facilityName,
        starts_at: row.slots?.starts_at || row.created_at,
        ends_at: row.slots?.ends_at || row.created_at,
        notes: row.notes || undefined,
        consultant_name: "Assigned Specialist",
        created_at: row.created_at,
      };
    });

    const upcomingBookings = allBookings
      .filter((b) => new Date(b.starts_at).getTime() >= new Date(nowISO).getTime() && b.status !== "cancelled")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 50);

    const pastBookings = allBookings
      .filter((b) => new Date(b.starts_at).getTime() < new Date(nowISO).getTime() || b.status === "cancelled")
      .slice(0, 50);

    // 2. Fetch Saved Items (count and list from the SAME query)
    const { data: savedRows, error: savedErr } = await admin
      .from("saved_items")
      .select("id, model_id, used_car_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedErr) {
      console.warn(`[dashboard] Failed to load saved items: ${savedErr.message}`);
    }

    const [models, usedCars] = await Promise.all([listModels(), listUsedCars()]);
    const savedVehicles: SavedVehicleRecord[] = [];

    for (const sRow of savedRows || []) {
      if (sRow.model_id) {
        const m = models.find((model) => model.id === sRow.model_id);
        if (m) {
          savedVehicles.push({ id: sRow.id, type: "model", item: m });
        }
      } else if (sRow.used_car_id) {
        const u = usedCars.find((car) => car.id === sRow.used_car_id);
        if (u) {
          savedVehicles.push({ id: sRow.id, type: "used", item: u });
        }
      }
    }

    // 3. Fetch Enquiries (Sanitized buyer-facing view only)
    const { data: leadRows, error: leadErr } = await admin
      .from("leads")
      .select(`
        id,
        ref,
        status,
        created_at,
        models:model_id ( name ),
        used_cars:used_car_id ( model_name, stock_id )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (leadErr) {
      console.warn(`[dashboard] Failed to load enquiries: ${leadErr.message}`);
    }

    const enquiries = (leadRows || []).map((l: any) => {
      let vName = "General Vehicle Enquiry";
      if (l.models?.name) {
        vName = l.models.name;
      } else if (l.used_cars?.model_name) {
        vName = `Certified Pre-Owned ${l.used_cars.model_name}`;
      }

      return {
        id: l.id,
        ref: l.ref || `LD-${l.id.slice(0, 6).toUpperCase()}`,
        vehicleName: vName,
        status: l.status,
        statusLabel: getBuyerStatusLabel(l.status),
        createdAt: l.created_at,
      };
    });

    return successResponse({
      upcomingBookings,
      pastBookings,
      savedVehicles,
      enquiries,
      counts: {
        bookings: upcomingBookings.length,
        saved: savedVehicles.length,
        enquiries: enquiries.length,
      },
    });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") {
      return errorResponse("UNAUTHORIZED", "Please sign in to view your buyer dashboard.");
    }
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to load dashboard data.");
  }
}

/**
 * Idempotently saves or unsaves a car model or pre-owned vehicle for the authenticated buyer.
 */
export async function toggleSaveVehicleAction(
  targetType: "model" | "used",
  targetIdOrSlug: string
): Promise<ActionResponse<{ isSaved: boolean }>> {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();

    let modelId: string | null = null;
    let usedCarId: string | null = null;

    if (targetType === "model") {
      const { data: model } = await admin
        .from("models")
        .select("id")
        .or(`id.eq.${targetIdOrSlug},slug.eq.${targetIdOrSlug}`)
        .maybeSingle();

      if (!model) return errorResponse("NOT_FOUND", "Vehicle model not found.");
      modelId = model.id;

      // Check if already saved
      const { data: existing } = await admin
        .from("saved_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("model_id", modelId)
        .maybeSingle();

      if (existing) {
        await admin.from("saved_items").delete().eq("id", existing.id);
        return successResponse({ isSaved: false });
      }

      await admin.from("saved_items").insert({
        user_id: user.id,
        model_id: modelId,
        used_car_id: null,
      });
      return successResponse({ isSaved: true });
    } else {
      const { data: usedCar } = await admin
        .from("used_cars")
        .select("id")
        .or(`id.eq.${targetIdOrSlug},stock_id.eq.${targetIdOrSlug}`)
        .maybeSingle();

      if (!usedCar) return errorResponse("NOT_FOUND", "Certified used car not found.");
      usedCarId = usedCar.id;

      // Check if already saved
      const { data: existing } = await admin
        .from("saved_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("used_car_id", usedCarId)
        .maybeSingle();

      if (existing) {
        await admin.from("saved_items").delete().eq("id", existing.id);
        return successResponse({ isSaved: false });
      }

      await admin.from("saved_items").insert({
        user_id: user.id,
        model_id: null,
        used_car_id: usedCarId,
      });
      return successResponse({ isSaved: true });
    }
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") {
      return errorResponse("UNAUTHORIZED", "Please sign in to save vehicles to your wishlist.");
    }
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to update saved items.");
  }
}

/**
 * Removes an item from the user's saved wishlist.
 */
export async function removeSavedVehicleAction(
  savedItemId: string
): Promise<ActionResponse<{ removed: boolean }>> {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();

    const { error } = await admin
      .from("saved_items")
      .delete()
      .eq("user_id", user.id)
      .eq("id", savedItemId);

    if (error) {
      return errorResponse("INTERNAL_ERROR", error.message);
    }

    return successResponse({ removed: true });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to remove item.");
  }
}

