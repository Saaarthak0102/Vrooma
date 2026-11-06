"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getViewer } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";

export interface UserDataExport {
  exportDate: string;
  dpdpNotice: string;
  profile: Record<string, any>;
  consents: Array<Record<string, any>>;
  bookings: Array<Record<string, any>>;
  enquiries: Array<Record<string, any>>;
  savedItems: Array<Record<string, any>>;
  tradeInSubmissions: Array<Record<string, any>>;
  supportChats: Array<Record<string, any>>;
}

/**
 * Assembles and returns all personal data associated with the authenticated user under Section 11 of DPDP Act 2023.
 */
export async function generateUserDataExportAction(): Promise<ActionResponse<UserDataExport>> {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();

    const [
      { data: profile },
      { data: consents },
      { data: bookings },
      { data: leads },
      { data: savedItems },
      { data: tradeIns },
      { data: chatRows },
    ] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).single(),
      admin.from("consents").select("purpose, granted, policy_version, source, created_at").eq("user_id", user.id),
      admin.from("bookings").select("ref, kind, status, vehicle_info, notes, created_at, slots:slot_id(starts_at, ends_at)").eq("user_id", user.id),
      admin.from("leads").select("ref, source, status, created_at, models:model_id(name), used_cars:used_car_id(model_name)").eq("user_id", user.id),
      admin.from("saved_items").select("created_at, models:model_id(name), used_cars:used_car_id(model_name)").eq("user_id", user.id),
      admin.from("trade_in_requests").select("brand, model, year, km, condition, notes, created_at").eq("user_id", user.id),
      admin.from("chat_conversations").select("title, created_at, chat_messages(role, content, created_at)").eq("user_id", user.id),
    ]);

    // Record formal export in data_requests table
    // supabase-js reports failures through { error }, it does not throw: check both writes explicitly.
    const { error: reqErr } = await admin.from("data_requests").insert({
      user_id: user.id,
      kind: "export",
      status: "done",
      note: "Self-service instant export downloaded by user",
    });
    if (reqErr) console.warn(`[data-rights] Could not record export request: ${reqErr.message}`);

    const { error: auditErr } = await admin.from("audit_log").insert({
      actor_id: user.id,
      table_name: "data_requests",
      record_id: user.id,
      action: "DATA_EXPORT_GENERATED",
      new_values: { requested_at: new Date().toISOString() },
    });
    if (auditErr) console.warn(`[data-rights] Could not write audit entry: ${auditErr.message}`);

    const exportPayload: UserDataExport = {
      exportDate: new Date().toISOString(),
      dpdpNotice: "This data docket contains all personal data collected by Vrooma (Company A, Lucknow) in compliance with the Digital Personal Data Protection Act 2023.",
      profile: profile || {},
      consents: consents || [],
      bookings: bookings || [],
      enquiries: leads || [],
      savedItems: savedItems || [],
      tradeInSubmissions: tradeIns || [],
      supportChats: (chatRows as Array<Record<string, any>> | null) || [],
    };

    return successResponse(exportPayload);
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") {
      return errorResponse("UNAUTHORIZED", "Please sign in to generate your DPDP personal data export.");
    }
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to generate personal data export.");
  }
}

/**
 * Submits a public data rights request (for signed-out users proving email control).
 */
export async function submitPublicDataRequestAction(
  email: string,
  kind: "export" | "delete"
): Promise<ActionResponse<{ message: string }>> {
  try {
    const admin = createAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail.includes("@")) {
      return errorResponse("VALIDATION_FAILED", "Please provide a valid email address.");
    }

    // Check if an account exists for this email
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    let reqRecordId: string | undefined;

    // Erasure is destructive: never queue it from an unverified email address. The requester must be
    // signed in as that exact account (the signed-in path is requestAccountDeletionAction).
    if (kind === "delete") {
      const viewer = await getViewer();
      const signedInEmail = viewer.user?.email?.toLowerCase().trim();
      if (!viewer.isAuthenticated || signedInEmail !== cleanEmail) {
        return errorResponse(
          "UNAUTHORIZED",
          "To erase your account, please sign in with this email address first, then request erasure from your dashboard."
        );
      }
    }

    if (profile) {
      const { data: reqRecord } = await admin
        .from("data_requests")
        .insert({
          user_id: profile.id,
          kind,
          status: "received",
          note: `Public DPDP ${kind} request submitted for account ${cleanEmail}`,
        })
        .select("id")
        .single();
      reqRecordId = reqRecord?.id;
    } else {
      // If no account exists, ensure all marketing/newsletter consents are withdrawn
      await admin.from("consents").insert({
        subject_email: cleanEmail,
        purpose: "marketing",
        granted: false,
        policy_version: "2026.1",
        source: "signup",
        text_hash: "public_opt_out_request",
      });
    }

    // Queue verification notice to customer
    await admin.from("messages_outbox").insert({
      channel: "email",
      to_address: cleanEmail,
      template: `dpdp_${kind}_request_received`,
      body: `Namaste! We received your request for personal data ${kind} under the DPDP Act 2023. Our Data Protection Officer will review and verify your request within 7 business days. Request Reference: ${reqRecordId || "REC-" + Date.now().toString(36)}`,
      idempotency_key: `outbox_dpdp_${kind}_${Date.now()}`,
      status: "pending",
    });

    return successResponse({
      message: `Your DPDP ${kind} request has been recorded. A verification notice has been sent to ${cleanEmail}.`,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to submit request.");
  }
}
