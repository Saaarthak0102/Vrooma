"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile, requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { BookingKind, Showroom, Workshop, DemoCar, Slot } from "@/types/domain";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { listDemoCars, listSlots } from "@/server/repositories/slots";
import { normalizeVehicleReg, maskVehicleReg } from "@/lib/validation/vehicle";

/**
 * Loads showrooms, demo cars, and available slots for the test drive booking wizard.
 */
export async function getTestDriveBookingDataAction(showroomId?: string, demoCarId?: string): Promise<{
  showrooms: Showroom[];
  demoCars: DemoCar[];
  slots: Slot[];
}> {
  const showrooms = await listShowrooms();
  const targetShowroomId = showroomId || showrooms[0]?.id;
  const demoCars = targetShowroomId ? await listDemoCars(targetShowroomId) : [];
  const targetDemoCarId = demoCarId || demoCars[0]?.id;
  const slots = targetShowroomId ? await listSlots({
    kind: "test_drive",
    showroomId: targetShowroomId,
    demoCarId: targetDemoCarId,
  }) : [];

  return { showrooms, demoCars, slots };
}

/**
 * Loads workshops and bay capacity slots for the workshop service booking wizard.
 */
export async function getServiceBookingDataAction(workshopId?: string): Promise<{
  workshops: Workshop[];
  slots: Slot[];
}> {
  const workshops = await listWorkshops();
  const targetWorkshopId = workshopId || workshops[0]?.id;
  const slots = targetWorkshopId ? await listSlots({
    kind: "service",
    workshopId: targetWorkshopId,
  }) : [];

  return { workshops, slots };
}

const bookSlotSchema = z.object({
  slotId: z.string().uuid("Invalid slot ID"),
  kind: z.enum(["test_drive", "service"]),
  vehicleInfo: z.object({
    model_name: z.string().min(1, "Model name is required"),
    variant_name: z.string().optional(),
    reg_no: z.string().optional(),
  }),
  serviceTypeId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  consentId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export type BookSlotInput = z.infer<typeof bookSlotSchema>;

export interface BookingResult {
  bookingId: string;
  ref: string;
  kind: BookingKind;
  startsAt: string;
  endsAt: string;
  showroomOrWorkshopName: string;
  consultantDisplayName: string;
}

/**
 * Server action to atomically book a test drive demo car or workshop service bay.
 * Handles concurrency, overlapping booking checks, DPDP consent, and lead auto-attachment.
 */
export async function bookSlotAction(
  input: BookSlotInput
): Promise<ActionResponse<BookingResult>> {
  try {
    const parsed = bookSlotSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_FAILED",
        parsed.error.errors[0]?.message || "Invalid booking payload"
      );
    }

    const { user, profile } = await requireCompleteProfile();
    const admin = createAdminClient();
    const userClient = await createClient();

    // If service booking, validate and normalize Indian registration number
    let vehicleInfo = { ...parsed.data.vehicleInfo };
    if (parsed.data.kind === "service") {
      if (!vehicleInfo.reg_no) {
        return errorResponse("VALIDATION_FAILED", "Vehicle registration number is required for service appointments");
      }
      const normalizedReg = normalizeVehicleReg(vehicleInfo.reg_no);
      if (!normalizedReg) {
        return errorResponse(
          "VALIDATION_FAILED",
          "Invalid vehicle registration number. Expected Indian format (e.g. UP32AB1234 or 22BH1234AA)"
        );
      }
      vehicleInfo.reg_no = normalizedReg;
    }

    // 1. Fetch slot details
    const { data: slot, error: slotErr } = await admin
      .from("slots")
      .select("id, kind, showroom_id, workshop_id, demo_car_id, starts_at, ends_at, capacity, booked_count, is_active")
      .eq("id", parsed.data.slotId)
      .maybeSingle();

    if (slotErr || !slot || !slot.is_active) {
      return errorResponse("NOT_FOUND", "Selected appointment slot is no longer active or was not found.");
    }

    // 2. Check for double-click / idempotency
    const idemKey = parsed.data.idempotencyKey || `book_${user.id}_${slot.id}`;
    const { data: existingWithKey } = await admin
      .from("bookings")
      .select("id, ref, status, created_at, slots:slot_id(starts_at, ends_at)")
      .eq("idempotency_key", idemKey)
      .maybeSingle();

    if (existingWithKey && existingWithKey.status !== "cancelled") {
      const existingSlot: any = existingWithKey.slots;
      return successResponse({
        bookingId: existingWithKey.id,
        ref: existingWithKey.ref,
        kind: parsed.data.kind,
        startsAt: existingSlot?.starts_at || slot.starts_at,
        endsAt: existingSlot?.ends_at || slot.ends_at,
        showroomOrWorkshopName: "Vrooma Lucknow Facility",
        consultantDisplayName: "Assigned Specialist",
      });
    }

    // 3. User may not hold two confirmed bookings of the same kind at overlapping times
    const { data: userBookings } = await admin
      .from("bookings")
      .select("id, ref, kind, status, slots:slot_id(starts_at, ends_at)")
      .eq("user_id", user.id)
      .eq("kind", parsed.data.kind)
      .eq("status", "confirmed");

    if (userBookings && userBookings.length > 0) {
      const targetStart = new Date(slot.starts_at).getTime();
      const targetEnd = new Date(slot.ends_at).getTime();

      for (const ub of userBookings) {
        const ubSlot: any = ub.slots;
        if (!ubSlot?.starts_at || !ubSlot?.ends_at) continue;
        const ubStart = new Date(ubSlot.starts_at).getTime();
        const ubEnd = new Date(ubSlot.ends_at).getTime();

        if (targetStart < ubEnd && targetEnd > ubStart) {
          const appointmentType = parsed.data.kind === "test_drive" ? "test drive" : "service";
          return errorResponse(
            "CONFLICT",
            `You already have a confirmed ${appointmentType} appointment (${ub.ref}) scheduled during this time window.`
          );
        }
      }
    }

    // 4. Call database RPC book_slot
    const { data: bookingRow, error: bookErr } = await (userClient || admin).rpc("book_slot", {
      p_slot_id: slot.id,
      p_kind: parsed.data.kind,
      p_vehicle_info: vehicleInfo as any,
      p_service_type_id: parsed.data.serviceTypeId || null,
      p_notes: parsed.data.notes || null,
      p_consent_id: parsed.data.consentId || null,
      p_idempotency_key: idemKey,
    });

    if (bookErr) {
      const msg = bookErr.message || "";
      if (bookErr.code === "VR001" || msg.includes("unavailable or fully booked")) {
        return errorResponse("CONFLICT", "Selected booking slot is unavailable or fully booked. Please choose another time slot.");
      }
      if (bookErr.code === "VR002" || msg.includes("lead time") || msg.includes("does not match")) {
        return errorResponse("VALIDATION_FAILED", msg);
      }
      if (bookErr.code === "VR007") {
        return errorResponse("NOT_FOUND", "Selected appointment slot was not found.");
      }
      return errorResponse("INTERNAL_ERROR", `Failed to confirm booking: ${msg}`);
    }

    // 5. Look up facility name & assign specialist
    let facilityName = "Vrooma Facility";
    let showroomIdToAssign = slot.showroom_id;

    if (slot.showroom_id) {
      const { data: sr } = await admin.from("showrooms").select("name").eq("id", slot.showroom_id).single();
      if (sr?.name) facilityName = sr.name;
    } else if (slot.workshop_id) {
      const { data: ws } = await admin.from("workshops").select("name").eq("id", slot.workshop_id).single();
      if (ws?.name) facilityName = ws.name;
    }

    // Fallback showroom if slot had neither
    if (!showroomIdToAssign) {
      const { data: fallbackSr } = await admin.from("showrooms").select("id").limit(1).single();
      if (fallbackSr?.id) showroomIdToAssign = fallbackSr.id;
    }

    // 6. Create / attach LEAD in the same flow so a named consultant is assigned
    let consultantDisplayName = "Senior Specialist";
    if (showroomIdToAssign) {
      try {
        const leadSource = "web";
        const leadMsg = parsed.data.kind === "test_drive"
          ? `Online booking for test drive: ${vehicleInfo.model_name}`
          : `Online workshop service booking: ${vehicleInfo.model_name} (${maskVehicleReg(vehicleInfo.reg_no)})`;

        const { data: leadRow } = await admin.rpc("create_lead", {
          p_name: profile.full_name,
          p_phone: profile.phone || "+919876543210",
          p_email: user.email || null,
          p_showroom_id: showroomIdToAssign,
          p_message: leadMsg,
          p_source: leadSource,
          p_source_ref: bookingRow.ref,
          p_consent_id: parsed.data.consentId || null,
          // Admin client has no JWT, so name the already-authenticated buyer explicitly.
          // The SQL function honours this only for the service role.
          p_user_id: user.id,
        });

        if (leadRow?.assigned_to) {
          const { data: consultantProfile } = await admin
            .from("profiles")
            .select("full_name")
            .eq("id", leadRow.assigned_to)
            .maybeSingle();

          if (consultantProfile?.full_name) {
            consultantDisplayName = consultantProfile.full_name;
          }
        }

        // If test drive, transition lead to test_drive_booked
        if (leadRow && parsed.data.kind === "test_drive") {
          await admin
            .from("leads")
            .update({ status: "test_drive_booked", updated_at: new Date().toISOString() })
            .eq("id", leadRow.id);
        }
      } catch (leadAttachErr: any) {
        console.warn(`[booking] Could not attach lead: ${leadAttachErr?.message}`);
      }
    }

    // 7. Enqueue confirmation notification in outbox
    try {
      const dest = profile.email || profile.phone || "customer@vrooma.in";
      const channel = profile.email ? "email" : "whatsapp";
      const appointmentKindLabel = parsed.data.kind === "test_drive" ? "Test Drive" : "Workshop Service";
      const dateFormatted = new Date(slot.starts_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      await admin.from("messages_outbox").insert({
        channel,
        to_address: dest,
        template: "booking_confirmation",
        body: `Namaste ${profile.full_name}! Your Vrooma ${appointmentKindLabel} appointment is confirmed (${bookingRow.ref}) on ${dateFormatted} at ${facilityName}. Assigned Specialist: ${consultantDisplayName}.`,
        idempotency_key: `outbox_booking_${bookingRow.id}`,
        status: "pending",
      });
    } catch (outboxErr: any) {
      console.warn(`[booking] Failed to queue outbox confirmation: ${outboxErr?.message}`);
    }

    return successResponse({
      bookingId: bookingRow.id,
      ref: bookingRow.ref,
      kind: parsed.data.kind,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      showroomOrWorkshopName: facilityName,
      consultantDisplayName,
    });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") {
      return errorResponse("UNAUTHORIZED", "Please sign in to confirm your appointment booking.");
    }
    if (err?.code === "INCOMPLETE_PROFILE") {
      return errorResponse("INCOMPLETE_PROFILE", "Please complete your driver profile before confirming booking.");
    }
    return errorResponse("INTERNAL_ERROR", err?.message || "Unexpected booking error occurred.");
  }
}

/**
 * Cancel an active booking and release slot capacity immediately.
 */
export async function cancelBookingAction(
  bookingId: string,
  reason?: string
): Promise<ActionResponse<{ bookingId: string; status: string }>> {
  try {
    const { user, profile } = await requireCompleteProfile();
    const admin = createAdminClient();
    const userClient = await createClient();

    const { data: booking, error: cancelErr } = await (userClient || admin).rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_reason: reason || "Cancelled by user",
    });

    if (cancelErr) {
      return errorResponse("INTERNAL_ERROR", `Failed to cancel appointment: ${cancelErr.message}`);
    }

    // Queue cancellation notice in outbox
    try {
      const dest = profile.email || profile.phone || "customer@vrooma.in";
      const channel = profile.email ? "email" : "whatsapp";
      await admin.from("messages_outbox").insert({
        channel,
        to_address: dest,
        template: "booking_cancellation",
        body: `Your Vrooma booking (${booking.ref}) has been cancelled. The time slot has been released.`,
        idempotency_key: `outbox_cancel_${booking.id}_${Date.now()}`,
        status: "pending",
      });
    } catch (err: any) {
      console.warn(`[booking] Outbox cancellation write error: ${err?.message}`);
    }

    return successResponse({
      bookingId: booking.id,
      status: booking.status,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Cancellation failed.");
  }
}

/**
 * Reschedule an existing appointment to a new slot in an atomic transaction.
 */
export async function rescheduleBookingAction(
  bookingId: string,
  newSlotId: string
): Promise<ActionResponse<{ newBookingId: string; ref: string }>> {
  try {
    const { user, profile } = await requireCompleteProfile();
    const admin = createAdminClient();
    const userClient = await createClient();

    const { data: newBooking, error: reschedErr } = await (userClient || admin).rpc("reschedule_booking", {
      p_booking_id: bookingId,
      p_new_slot_id: newSlotId,
    });

    if (reschedErr) {
      const msg = reschedErr.message || "";
      if (reschedErr.code === "VR001" || msg.includes("unavailable or fully booked")) {
        return errorResponse("CONFLICT", "Target appointment slot is unavailable or fully booked.");
      }
      return errorResponse("INTERNAL_ERROR", `Reschedule failed: ${msg}`);
    }

    // Queue outbox reschedule notice
    try {
      const dest = profile.email || profile.phone || "customer@vrooma.in";
      const channel = profile.email ? "email" : "whatsapp";
      await admin.from("messages_outbox").insert({
        channel,
        to_address: dest,
        template: "booking_reschedule",
        body: `Your appointment has been rescheduled. New booking reference: ${newBooking.ref}.`,
        idempotency_key: `outbox_resched_${newBooking.id}`,
        status: "pending",
      });
    } catch (err: any) {
      console.warn(`[booking] Outbox reschedule write error: ${err?.message}`);
    }

    return successResponse({
      newBookingId: newBooking.id,
      ref: newBooking.ref,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Rescheduling failed.");
  }
}

/**
 * Admin action: Generate future slots for test drives and service workshop bays.
 */
export async function generateSlotsAction(
  startDate?: string,
  days: number = 14
): Promise<ActionResponse<{ createdCount: number }>> {
  try {
    await requireRole("admin");
    const admin = createAdminClient();

    const validDays = Math.min(Math.max(1, days), 60); // Maximum 60 days
    const dateParam = startDate || new Date().toISOString().slice(0, 10);

    const { data: count, error } = await admin.rpc("generate_slots", {
      p_start_date: dateParam,
      p_days: validDays,
    });

    if (error) {
      return errorResponse("INTERNAL_ERROR", `Failed to generate slots: ${error.message}`);
    }

    return successResponse({ createdCount: count || 0 });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Slot generation failed.");
  }
}
