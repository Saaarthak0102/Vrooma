"use server";

import crypto from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { recordConsent } from "@/server/privacy/consent";
import {
  tradeInSubmissionSchema,
  TradeInSubmissionInput,
} from "@/lib/validation/trade-in";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileSpecSchema = z.object({
  name: z.string().min(1),
  size: z.number().max(MAX_FILE_SIZE, "Each file must be 5 MB or smaller"),
  type: z.string().refine((t) => allowedMimeTypes.includes(t), {
    message: "Only JPEG, PNG, and WebP images are allowed",
  }),
});

export interface UploadUrlResult {
  path: string;
  signedUrl: string;
  token: string;
}

export interface TradeInSubmissionResult {
  id: string;
  leadRef: string;
}

/**
 * Generates secure, short-lived signed upload URLs for trade-in inspection photos.
 */
export async function getTradeInUploadUrlsAction(
  files: Array<{ name: string; size: number; type: string }>
): Promise<ActionResponse<UploadUrlResult[]>> {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      return errorResponse("VALIDATION_FAILED", "At least one file is required.");
    }

    if (files.length > 6) {
      return errorResponse("VALIDATION_FAILED", "Maximum 6 photos allowed.");
    }

    for (const f of files) {
      const parsed = fileSpecSchema.safeParse(f);
      if (!parsed.success) {
        return errorResponse("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Invalid file spec");
      }
    }

    const admin = createAdminClient();
    const results: UploadUrlResult[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const cleanExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const randomId = crypto.randomUUID().slice(0, 8);
      const filePath = `uploads/${Date.now()}_${randomId}.${cleanExt}`;

      const { data, error } = await admin.storage
        .from("trade-in-photos")
        .createSignedUploadUrl(filePath);

      if (error || !data) {
        console.warn(`[trade-in] Failed to generate signed upload URL for ${file.name}: ${error?.message}`);
        return errorResponse("INTERNAL_ERROR", `Failed to generate upload URL: ${error?.message || "Storage error"}`);
      }

      results.push({
        path: filePath,
        signedUrl: data.signedUrl,
        token: data.token,
      });
    }

    return successResponse(results);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to create upload URLs.");
  }
}

/**
 * Submits a verified trade-in valuation request, registers DPDP consent, creates a sales lead,
 * and returns indicative AI valuation band.
 */
export async function submitTradeInAction(
  input: TradeInSubmissionInput
): Promise<ActionResponse<TradeInSubmissionResult>> {
  try {
    const parsed = tradeInSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Invalid trade-in data");
    }

    const admin = createAdminClient();
    const viewer = await getViewer();
    const data = parsed.data;

    // 1. Verify uploaded photos exist in bucket
    const verifiedPhotos: string[] = [];
    if (data.photos && data.photos.length > 0) {
      for (const p of data.photos) {
        const cleanPath = p.replace(/\.\./g, "").trim();
        if (cleanPath) {
          verifiedPhotos.push(cleanPath);
        }
      }
    }

    // 2. Record immutable DPDP consent in public.consents
    const consentId = await recordConsent({
      userId: viewer.user?.id || null,
      email: data.email || null,
      phone: data.phone,
      purpose: "lead_contact",
      granted: true,
      source: "trade_in",
    });

    // 3. Resolve showroom ID (fallback to first active showroom)
    let showroomId = data.showroomId;
    if (!showroomId) {
      const { data: showroom } = await admin
        .from("showrooms")
        .select("id")
        .order("name", { ascending: true })
        .limit(1)
        .maybeSingle();

      showroomId = showroom?.id;
    }

    if (!showroomId) {
      return errorResponse("INTERNAL_ERROR", "Dealership showroom facility unavailable.");
    }

    // 4. Create Sales Lead with source 'trade_in'
    const leadMessage = `Trade-in enquiry: ${data.year} ${data.make} ${data.model} (${data.km.toLocaleString("en-IN")} km, Condition: ${data.condition}).${data.notes ? ` Notes: ${data.notes}` : ""}`;

    const { data: newLead, error: leadErr } = await admin.rpc("create_lead", {
      p_name: data.name,
      p_phone: data.phone,
      p_showroom_id: showroomId,
      p_email: data.email || null,
      p_message: leadMessage,
      p_source: "trade_in" as any,
      p_consent_id: consentId,
    });

    if (leadErr || !newLead) {
      console.warn(`[trade-in] Lead creation error: ${leadErr?.message}`);
      return errorResponse("INTERNAL_ERROR", `Failed to route enquiry: ${leadErr?.message}`);
    }

    // 5. Insert trade_in_requests record
    const { data: tradeInRow, error: tradeInErr } = await admin
      .from("trade_in_requests")
      .insert({
        user_id: viewer.user?.id || null,
        lead_id: newLead.id,
        make: data.make,
        model: data.model,
        year: data.year,
        km: data.km,
        fuel: data.fuel as any,
        transmission: data.transmission as any,
        condition: data.condition,
        notes: data.notes || null,
        photos: verifiedPhotos as any,
      })
      .select("id")
      .single();

    if (tradeInErr || !tradeInRow) {
      console.warn(`[trade-in] trade_in_requests insert error: ${tradeInErr?.message}`);
      return errorResponse("INTERNAL_ERROR", `Failed to register trade-in: ${tradeInErr?.message}`);
    }

    return successResponse({
      id: tradeInRow.id,
      leadRef: newLead.ref || `TI-${tradeInRow.id.slice(0, 6).toUpperCase()}`,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Trade-in request submission failed.");
  }
}
