"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { Booking, ChatConversationSummary, Model, UsedCar } from "@/types/domain";
import { SavedVehicleRecord } from "@/server/repositories/saved";
import { listModels } from "@/server/repositories/models";
import { listUsedCars } from "@/server/repositories/used-cars";

export interface BuyerDashboardData {
  upcomingBookings: Booking[];
  pastBookings: Booking[];
  savedVehicles: SavedVehicleRecord[];
  chats: ChatConversationSummary[];
  counts: {
    bookings: number;
    saved: number;
    chats: number;
  };
}

// The id columns are UUIDs; comparing them to a slug in a PostgREST filter errors, so pick the column explicitly.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        address,
        pincode,
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

    // The consultant named on each booking is the one assigned to the lead created with it (lead.source_ref = booking ref).
    const consultantByRef = new Map<string, string>();
    const refs = (bookingRows || []).map((r: any) => r.ref).filter(Boolean) as string[];
    if (refs.length > 0) {
      const { data: refLeads } = await admin
        .from("leads")
        .select("source_ref, assigned_to")
        .in("source_ref", refs)
        .not("assigned_to", "is", null);
      const consultantIds = Array.from(new Set((refLeads || []).map((l) => l.assigned_to as string)));
      if (consultantIds.length > 0) {
        const { data: consultants } = await admin.from("profiles").select("id, full_name").in("id", consultantIds);
        const nameById = new Map((consultants || []).map((c) => [c.id, c.full_name as string]));
        for (const l of refLeads || []) {
          const name = nameById.get(l.assigned_to as string);
          if (l.source_ref && name) consultantByRef.set(l.source_ref, name);
        }
      }
    }

    const allBookings: Booking[] = (bookingRows || []).map((row: any) => {
      const vInfo = typeof row.vehicle_info === "object" && row.vehicle_info !== null
        ? row.vehicle_info
        : { model_name: "Vehicle" };

      const facilityName =
        row.slots?.showrooms?.name ||
        row.slots?.workshops?.name ||
        "Vrooma facility";

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
        address: row.address ?? null,
        pincode: row.pincode ?? null,
        // Undefined until a consultant is actually assigned: the UI then hides the line instead of faking a name.
        consultant_name: consultantByRef.get(row.ref) ?? undefined,
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

    // 3. Fetch support-chat history (newest first), with a one-line preview of the latest message
    const { data: convRows, error: convErr } = await admin
      .from("chat_conversations")
      .select("id, title, last_message_at")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false })
      .limit(50);

    if (convErr) {
      console.warn(`[dashboard] Failed to load chats: ${convErr.message}`);
    }

    // One bounded query for previews and counts (newest first), never every message of every chat.
    const convIds = (convRows || []).map((c) => c.id);
    const previews = new Map<string, { snippet: string; count: number }>();
    if (convIds.length > 0) {
      const { data: recentMsgs } = await admin
        .from("chat_messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(500);
      for (const m of recentMsgs || []) {
        const entry = previews.get(m.conversation_id);
        if (entry) entry.count += 1;
        else previews.set(m.conversation_id, { snippet: m.content, count: 1 });
      }
    }

    const chats: ChatConversationSummary[] = (convRows || []).map((c) => ({
      id: c.id,
      title: c.title,
      snippet: previews.get(c.id)?.snippet ?? "",
      messageCount: previews.get(c.id)?.count ?? 0,
      lastMessageAt: c.last_message_at,
    }));

    return successResponse({
      upcomingBookings,
      pastBookings,
      savedVehicles,
      chats,
      counts: {
        bookings: upcomingBookings.length,
        saved: savedVehicles.length,
        chats: chats.length,
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
 * Whether the signed-in buyer has saved this model. Signed-out visitors simply get `false`.
 */
export async function isModelSavedAction(modelSlug: string): Promise<ActionResponse<{ isSaved: boolean }>> {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();
    const { data: model } = await admin.from("models").select("id").eq("slug", modelSlug).maybeSingle();
    if (!model) return successResponse({ isSaved: false });
    const { data: existing } = await admin
      .from("saved_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("model_id", model.id)
      .maybeSingle();
    return successResponse({ isSaved: !!existing });
  } catch {
    return successResponse({ isSaved: false });
  }
}

/**
 * Idempotently saves or unsaves a car model or pre-owned vehicle for the authenticated buyer.
 */
export async function toggleSaveVehicleAction(
  targetType: "model" | "used",
  targetIdOrSlug: string,
  /** When given, the call SETS the state (true = saved, false = not saved) instead of flipping it, so a stale tab cannot invert the user's intent. */
  desired?: boolean
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
        .eq(UUID_RE.test(targetIdOrSlug) ? "id" : "slug", targetIdOrSlug)
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
        if (desired === true) return successResponse({ isSaved: true });
        await admin.from("saved_items").delete().eq("id", existing.id);
        return successResponse({ isSaved: false });
      }
      if (desired === false) return successResponse({ isSaved: false });

      const { error: insertErr } = await admin.from("saved_items").insert({
        user_id: user.id,
        model_id: modelId,
        used_car_id: null,
      });
      if (insertErr) {
        if (insertErr.code === "23505") return successResponse({ isSaved: true }); // saved concurrently
        return errorResponse("INTERNAL_ERROR", "Could not update saved vehicles. Please try again.");
      }
      return successResponse({ isSaved: true });
    } else {
      const { data: usedCar } = await admin
        .from("used_cars")
        .select("id")
        .eq(UUID_RE.test(targetIdOrSlug) ? "id" : "stock_id", targetIdOrSlug)
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
        if (desired === true) return successResponse({ isSaved: true });
        await admin.from("saved_items").delete().eq("id", existing.id);
        return successResponse({ isSaved: false });
      }
      if (desired === false) return successResponse({ isSaved: false });

      const { error: insertErr } = await admin.from("saved_items").insert({
        user_id: user.id,
        model_id: null,
        used_car_id: usedCarId,
      });
      if (insertErr) {
        if (insertErr.code === "23505") return successResponse({ isSaved: true }); // saved concurrently
        return errorResponse("INTERNAL_ERROR", "Could not update saved vehicles. Please try again.");
      }
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

