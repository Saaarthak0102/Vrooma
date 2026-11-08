"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireCompleteProfile } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { normalizeIndianPhone } from "@/lib/phone";
import { recordConsent } from "@/server/privacy/consent";
import { Profile } from "@/types/domain";
import { isRestorableAccount } from "@/lib/account-restore";

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  phone: z.string().transform((val) => normalizeIndianPhone(val) || "").refine((val) => val.length === 13, {
    message: "Valid 10-digit Indian mobile number required",
  }),
  whatsapp: z.string().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  marketingConsent: z.boolean().optional(),
  expectedUpdatedAt: z.string().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Updates the authenticated buyer's profile details with concurrency protection and DPDP consent tracking.
 */
export async function updateBuyerProfileAction(
  input: ProfileUpdateInput
): Promise<ActionResponse<Profile>> {
  try {
    const { user, profile } = await requireCompleteProfile();
    const parsed = profileUpdateSchema.safeParse(input);

    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Invalid input");
    }

    const admin = createAdminClient();

    // 1. Optimistic concurrency check
    if (parsed.data.expectedUpdatedAt && profile.updated_at !== parsed.data.expectedUpdatedAt) {
      return errorResponse("CONFLICT", "Profile was updated in another window. Please reload to see latest details.");
    }

    const nowISO = new Date().toISOString();
    const cleanWhatsapp = parsed.data.whatsapp ? normalizeIndianPhone(parsed.data.whatsapp) : parsed.data.phone;

    // 2. Update profile record
    const { data: updated, error: updateErr } = await admin
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        whatsapp: cleanWhatsapp || parsed.data.phone,
        city_id: parsed.data.cityId || profile.city_id,
        updated_at: nowISO,
      })
      .eq("id", user.id)
      .select("*")
      .single();

    if (updateErr) {
      return errorResponse("INTERNAL_ERROR", `Failed to update profile: ${updateErr.message}`);
    }

    // 3. If marketing consent is toggled, append immutable consent row
    if (parsed.data.marketingConsent !== undefined) {
      await recordConsent({
        userId: user.id,
        purpose: "marketing",
        granted: parsed.data.marketingConsent,
        source: "profile",
      });
    }


    return successResponse(updated as Profile);
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") {
      return errorResponse("UNAUTHORIZED", "Please sign in to update your profile.");
    }
    return errorResponse("INTERNAL_ERROR", err?.message || "Profile update failed.");
  }
}

/**
 * Initiates an email address change request via Supabase Auth.
 * Supabase automatically sends confirmation emails to the new address.
 */
export async function requestEmailChangeAction(
  newEmail: string
): Promise<ActionResponse<{ message: string }>> {
  try {
    const { user } = await requireUser();
    const supabase = await createClient();

    const cleanEmail = newEmail.toLowerCase().trim();
    if (!cleanEmail.includes("@") || cleanEmail.length < 5) {
      return errorResponse("VALIDATION_FAILED", "Please provide a valid email address.");
    }

    if (!supabase) {
      return errorResponse("INTERNAL_ERROR", "Auth client unavailable.");
    }

    const { error } = await supabase.auth.updateUser({ email: cleanEmail });

    if (error) {
      return errorResponse("INTERNAL_ERROR", error.message);
    }

    return successResponse({
      message: `A confirmation link has been sent to ${cleanEmail}. Please click the link to confirm your email update.`,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to initiate email change.");
  }
}

/**
 * Self-service account deletion under DPDP Act 2023.
 * Releases upcoming booked slots, closes open leads, initiates 7-day cooling off grace period, and signs out.
 */
export async function requestAccountDeletionAction(): Promise<ActionResponse<{ requestId: string; gracePeriodDays: number }>> {
  try {
    const { user, profile } = await requireUser();

    // Administrative safeguard: staff and admin accounts cannot self-delete
    if (profile && profile.role !== "buyer") {
      return errorResponse(
        "FORBIDDEN",
        "Staff and Administrator accounts cannot self-delete. Please contact the Dealer Principal to revoke credentials."
      );
    }

    const admin = createAdminClient();
    const userClient = await createClient();

    // 1. Queue the erasure request FIRST. If this fails nothing else has been changed, so the user can simply retry.
    const { data: reqId, error: rpcErr } = await (userClient || admin).rpc("request_account_deletion");

    if (rpcErr) {
      return errorResponse("INTERNAL_ERROR", `Failed to queue deletion request: ${rpcErr.message}`);
    }

    // 2. Cancel any upcoming confirmed bookings so slots are immediately released to other buyers.
    //    cancel_booking authorises via auth.uid(), so it must run as the signed-in user, not the service role.
    const { data: upcomingBookings } = await admin
      .from("bookings")
      .select("id, ref, slots:slot_id(starts_at)")
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    const now = Date.now();
    for (const b of upcomingBookings || []) {
      const slotTime = (b.slots as any)?.starts_at;
      if (slotTime && new Date(slotTime).getTime() > now) {
        const { error: cErr } = await (userClient || admin).rpc("cancel_booking", {
          p_booking_id: b.id,
          p_reason: "Cancelled due to DPDP account erasure request",
        });
        if (cErr) console.warn(`[deletion] Slot release warning for ${b.ref}: ${cErr.message}`);
      }
    }

    // 3. Close open leads and notify assigned consultants
    const { data: openLeads } = await admin
      .from("leads")
      .select("id, ref, assigned_to")
      .eq("user_id", user.id)
      .not("status", "in", '("won","lost")');

    for (const lead of openLeads || []) {
      await admin
        .from("leads")
        .update({
          status: "lost",
          lost_reason: "Customer requested DPDP erasure",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (lead.assigned_to) {
        await admin.from("messages_outbox").insert({
          channel: "email",
          to_address: "staff@vrooma.in",
          template: "lead_closed_deletion",
          body: `Notice: Lead ${lead.ref} was automatically closed because the buyer submitted an account erasure request under the DPDP Act 2023.`,
          lead_id: lead.id,
          idempotency_key: `outbox_del_lead_${lead.id}`,
          status: "pending",
        });
      }
    }

    // 4. Sign user out
    if (userClient) {
      await userClient.auth.signOut();
    }

    return successResponse({
      requestId: reqId,
      gracePeriodDays: 7,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Account deletion request failed.");
  }
}

/**
 * Undo an erasure request during the 7-day cooling-off window. Runs as the signed-in user (the RPC checks
 * auth.uid()). Bookings released and leads closed at request time are not reopened.
 */
export async function cancelAccountDeletionAction(): Promise<ActionResponse<{ requestId: string }>> {
  try {
    const { user, profile } = await requireUser();
    if (profile && !isRestorableAccount(profile) && profile.is_active === false) {
      return errorResponse("FORBIDDEN", "This account can no longer be restored. Please contact support.");
    }

    const supabase = await createClient();
    if (!supabase) return errorResponse("INTERNAL_ERROR", "Database client unavailable");

    const { data, error } = await supabase.rpc("cancel_account_deletion");
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "VR006") {
        return errorResponse("CONFLICT", "There is no pending deletion request to cancel. It may already be finalised.");
      }
      return errorResponse("INTERNAL_ERROR", `Could not restore the account: ${error.message}`);
    }

    console.info(`[deletion] Account ${user.id} restored; request ${data} cancelled`);
    return successResponse({ requestId: data as string });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not restore the account.");
  }
}

