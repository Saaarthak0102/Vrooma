"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompleteProfile } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { listShowrooms } from "@/server/repositories/showrooms";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Get Offer" on a model page: creates a real lead for the signed-in buyer so a named consultant
 * is assigned (the 5-minute SLA applies). Repeat requests are de-duplicated by create_lead.
 */
export async function requestModelOfferAction(
  modelSlug: string,
  variantName?: string
): Promise<ActionResponse<{ ref: string | null; consultantName: string | null }>> {
  try {
    const { user, profile } = await requireCompleteProfile();
    if (!profile.phone) {
      return errorResponse("VALIDATION_FAILED", "Please add a mobile number to your profile so a consultant can reach you.");
    }

    const admin = createAdminClient();
    const { data: model } = await admin.from("models").select("id, name").eq("slug", modelSlug).maybeSingle();
    if (!model) return errorResponse("NOT_FOUND", "Vehicle model not found.");

    const showrooms = await listShowrooms();
    const showroomId = showrooms.find((s) => UUID_RE.test(s.id))?.id;
    if (!showroomId) return errorResponse("INTERNAL_ERROR", "No showroom is available right now. Please try again shortly.");

    const { data: lead, error } = await admin.rpc("create_lead", {
      p_name: profile.full_name,
      p_phone: profile.phone,
      p_email: user.email || null,
      p_showroom_id: showroomId,
      p_model_id: model.id,
      p_message: `Offer request: ${model.name}${variantName ? ` ${variantName}` : ""}`,
      p_source: "web",
      // The admin client has no JWT, so name the already-authenticated buyer explicitly.
      p_user_id: user.id,
    });
    if (error || !lead) {
      return errorResponse("INTERNAL_ERROR", "We could not submit your request. Please try again.");
    }

    let consultantName: string | null = null;
    if (lead.assigned_to) {
      const { data: consultant } = await admin.from("profiles").select("full_name").eq("id", lead.assigned_to).maybeSingle();
      consultantName = consultant?.full_name ?? null;
    }

    return successResponse({ ref: (lead as { ref?: string | null }).ref ?? null, consultantName });
  } catch (err: any) {
    if (err?.code === "UNAUTHORIZED") return errorResponse("UNAUTHORIZED", "Please sign in to request an offer.");
    if (err?.code === "INCOMPLETE_PROFILE") return errorResponse("INCOMPLETE_PROFILE", "Please complete your profile first.");
    return errorResponse("INTERNAL_ERROR", "We could not submit your request. Please try again.");
  }
}
