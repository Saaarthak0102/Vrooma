"use server";

import { serviceVisitSchema } from "@/lib/garage";
import { recordServiceVisit } from "@/server/services/garage";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile, requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { BookingKind, Showroom, Workshop, DemoCar, Slot } from "@/types/domain";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { listDemoCars, listSlots } from "@/server/repositories/slots";
import { normalizeVehicleReg, maskVehicleReg } from "@/lib/validation/vehicle";
import { recordConsent } from "@/server/privacy/consent";
import { queueWhatsAppCopy } from "@/server/services/outbox";

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
  /** DPDP consent: must be explicitly true; the server records the immutable consent row. */
  consent: z.literal(true, { errorMap: () => ({ message: "DPDP consent is required to confirm a booking." }) }),
  contactName: z.string().trim().min(1).max(120).optional().nullable(),
  contactPhone: z.string().trim().max(20).optional().nullable(),
  idempotencyKey: z.string().max(200).optional().nullable(),
  /** Home test drive / vehicle pickup: the customer's address is asked here, not on the profile. */
  homeVisit: z.boolean().optional(),
  address: z.string().trim().max(255).optional().nullable(),
  pincode: z.string().trim().optional().nullable(),
}).superRefine((val, ctx) => {
  if (!val.homeVisit) return;
  const address = (val.address ?? "").trim();
  if (address.length < 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Please enter the full address (at least 5 characters)." });
  }
  if (!/^[1-9][0-9]{5}$/.test((val.pincode ?? "").trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pincode"], message: "Please enter a valid 6-digit PIN code." });
  }
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

    // Record the explicit DPDP consent for this booking (immutable audit row).
    let consentId: string | null = null;
    try {
      consentId = await recordConsent({
        userId: user.id,
        email: user.email,
        phone: parsed.data.contactPhone || profile.phone || null,
        purpose: parsed.data.kind === "service" ? "service_contact" : "lead_contact",
        granted: true,
        source: "booking",
        consentText: "I consent to Vrooma contacting me about this appointment and processing my details under the DPDP Act 2023.",
      });
    } catch (consentErr: any) {
      return errorResponse("INTERNAL_ERROR", "We could not record your consent. Please try again.");
    }

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
      .eq("user_id", user.id)
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
            `You already have a confirmed ${appointmentType} appointment (${ub.ref}) scheduled during this time window.`,
            { reason: "already_booked" }
          );
        }
      }
    }

    // 4. Call database RPC book_slot
    const { data: bookingRow, error: bookErr } = await (userClient || admin).rpc("book_slot", {
      p_slot_id: slot.id,
      p_kind: parsed.data.kind,
      p_vehicle_info: vehicleInfo as any,
      p_service_type_id: parsed.data.serviceTypeId || undefined,
      p_notes: parsed.data.notes || undefined,
      p_consent_id: consentId,
      p_idempotency_key: idemKey,
      // Only a home visit stores an address; showroom and workshop visits never do.
      p_address: parsed.data.homeVisit ? parsed.data.address!.trim() : undefined,
      p_pincode: parsed.data.homeVisit ? parsed.data.pincode!.trim() : undefined,
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
      if (bookErr.code === "23505") {
        return errorResponse("CONFLICT", "You already have a booking for this slot.", { reason: "already_booked" });
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
    const leadPhone = parsed.data.contactPhone || profile.phone || null;
    // Never invent a phone number: a consultant would call it. Without one, skip the lead (booking still stands).
    if (showroomIdToAssign && leadPhone) {
      try {
        const leadSource = "web";
        const leadMsg = parsed.data.kind === "test_drive"
          ? `Online booking for test drive: ${vehicleInfo.model_name}`
          : `Online workshop service booking: ${vehicleInfo.model_name} (${maskVehicleReg(vehicleInfo.reg_no)})`;

        const { data: leadRow } = await admin.rpc("create_lead", {
          p_name: parsed.data.contactName || profile.full_name,
          p_phone: leadPhone,
          p_email: user.email || undefined,
          p_showroom_id: showroomIdToAssign,
          p_message: leadMsg,
          p_source: leadSource,
          p_source_ref: bookingRow.ref,
          p_consent_id: consentId,
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

      const confirmationBody = parsed.data.homeVisit
        ? `Namaste ${profile.full_name}! Your Vrooma ${appointmentKindLabel} appointment is confirmed (${bookingRow.ref}) on ${dateFormatted}. We will come to your address (${parsed.data.address!.trim()}, ${parsed.data.pincode!.trim()}). Assigned Specialist: ${consultantDisplayName}.`
        : `Namaste ${profile.full_name}! Your Vrooma ${appointmentKindLabel} appointment is confirmed (${bookingRow.ref}) on ${dateFormatted} at ${facilityName}. Assigned Specialist: ${consultantDisplayName}.`;

      await admin.from("messages_outbox").insert({
        channel,
        to_address: dest,
        template: "booking_confirmation",
        body: confirmationBody,
        idempotency_key: `outbox_booking_${bookingRow.id}`,
        status: "pending",
      });
      // Email is the primary row; the buyer also gets it on WhatsApp (if no email, the row above already is WhatsApp).
      if (profile.email) {
        await queueWhatsAppCopy({
          phone: profile.phone,
          template: "booking_confirmation",
          body: confirmationBody,
          idempotencyKey: `outbox_booking_${bookingRow.id}`,
        });
      }
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
      const cancelBody = `Your Vrooma booking (${booking.ref}) has been cancelled. The time slot has been released.`;
      const cancelKey = `outbox_cancel_${booking.id}_${Date.now()}`;
      await admin.from("messages_outbox").insert({
        channel,
        to_address: dest,
        template: "booking_cancellation",
        body: cancelBody,
        idempotency_key: cancelKey,
        status: "pending",
      });
      if (profile.email) {
        await queueWhatsAppCopy({ phone: profile.phone, template: "booking_cancellation", body: cancelBody, idempotencyKey: cancelKey });
      }
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
 * Staff action: record the outcome of a confirmed appointment once its slot has started.
 */
export async function setBookingOutcomeAction(
  bookingId: string,
  outcome: "completed" | "no_show",
  /** Service bookings only: odometer and next due date, saved to the owner's service history. */
  serviceVisit?: unknown
): Promise<ActionResponse<{ bookingId: string; status: string; serviceHistory?: "recorded" | "skipped"; serviceNote?: string }>> {
  try {
    const { user: staff } = await requireRole("consultant", "manager", "admin");
    if (outcome !== "completed" && outcome !== "no_show") {
      return errorResponse("VALIDATION_FAILED", "Unknown outcome.");
    }

    const admin = createAdminClient();
    const { data: booking } = await admin
      .from("bookings")
      .select("id, status, kind, user_id, vehicle_info, slots:slot_id(starts_at)")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return errorResponse("NOT_FOUND", "Booking not found.");
    if (booking.status !== "confirmed") {
      return errorResponse("CONFLICT", `This booking is already ${booking.status}.`);
    }
    const startsAt = (booking.slots as any)?.starts_at;
    if (startsAt && new Date(startsAt).getTime() > Date.now()) {
      return errorResponse("VALIDATION_FAILED", "This appointment has not started yet.");
    }

    // Guard on the current status so two staff members cannot both change it.
    const { data: updated, error } = await admin
      .from("bookings")
      .update({ status: outcome, updated_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .select("id, status")
      .maybeSingle();

    if (error) return errorResponse("INTERNAL_ERROR", error.message);
    if (!updated) return errorResponse("CONFLICT", "This booking was just updated by someone else.");

    // Attended service with details: add it to the buyer's service history (best effort, never blocks the outcome).
    if (outcome === "completed" && booking.kind === "service" && serviceVisit) {
      const parsed = serviceVisitSchema.safeParse(serviceVisit);
      if (!parsed.success) {
        return successResponse({ bookingId: updated.id, status: updated.status, serviceHistory: "skipped", serviceNote: parsed.error.issues[0]?.message });
      }
      try {
        const res = await recordServiceVisit({
          booking: { id: booking.id, user_id: booking.user_id, kind: booking.kind, vehicle_info: booking.vehicle_info, servicedAt: startsAt },
          visit: parsed.data,
          staffId: staff.id,
        });
        return successResponse({
          bookingId: updated.id,
          status: updated.status,
          serviceHistory: res.recorded ? "recorded" : "skipped",
          serviceNote: res.recorded ? undefined : res.reason,
        });
      } catch (e: any) {
        console.warn(`[booking] service history not recorded for ${booking.id}: ${e?.message}`);
        return successResponse({ bookingId: updated.id, status: updated.status, serviceHistory: "skipped", serviceNote: "Could not save the service history." });
      }
    }

    return successResponse({ bookingId: updated.id, status: updated.status });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED" || err?.code === "FORBIDDEN") {
      return errorResponse(err.code, "You do not have permission to update bookings.");
    }
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not update the booking.");
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
