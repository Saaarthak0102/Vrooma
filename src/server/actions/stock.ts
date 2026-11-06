"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { computePriceBand, type PastSale, type PriceBand } from "@/lib/price-band";

/**
 * The AI price band. The brief makes it visible to the Used-Car Manager ONLY, so it is produced here on the
 * server behind requireRole instead of being computed in the browser where any signed-in user's bundle could run it.
 *
 * `null` data means "no comparable past sales": the UI says so instead of showing a made-up range.
 */
export async function getPriceBandAction(subject: {
  model_name: string;
  year: number;
  km: number;
  fuel?: string | null;
}): Promise<ActionResponse<PriceBand | null>> {
  try {
    await requireRole("manager", "admin");

    if (!subject.model_name?.trim() || !Number.isFinite(subject.year) || !Number.isFinite(subject.km)) {
      return errorResponse("VALIDATION_FAILED", "Model, year and kilometres are required.");
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("used_car_sales_history")
      .select("model_name, year, fuel, km, sold_price")
      .ilike("model_name", subject.model_name.trim())
      .gte("year", subject.year - 2)
      .lte("year", subject.year + 2)
      .limit(200);

    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    return successResponse(computePriceBand(subject, (data ?? []) as PastSale[]));
  } catch (err: any) {
    const forbidden = err?.code === "FORBIDDEN" || err?.code === "UNAUTHORIZED";
    return errorResponse(forbidden ? "FORBIDDEN" : "INTERNAL_ERROR", forbidden ? "Manager access required." : err?.message || "Could not compute the price band.");
  }
}

const PHOTO_BUCKET = "trade-in-photos";

/** Short-lived signed links for a trade-in's photos. Staff only; the bucket is private. */
export async function getTradeInPhotosAction(requestId: string): Promise<ActionResponse<string[]>> {
  try {
    await requireRole("consultant", "manager", "admin");
    const admin = createAdminClient();

    const { data, error } = await admin.from("trade_in_requests").select("photos").eq("id", requestId).maybeSingle();
    if (error) return errorResponse("INTERNAL_ERROR", error.message);
    if (!data) return errorResponse("NOT_FOUND", "Trade-in request not found.");

    const paths = (Array.isArray(data.photos) ? data.photos : [])
      .filter((p): p is string => typeof p === "string" && !p.includes(".."))
      .slice(0, 8);
    if (paths.length === 0) return successResponse([]);

    const { data: signed, error: signErr } = await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 600);
    if (signErr) return errorResponse("INTERNAL_ERROR", signErr.message);

    return successResponse((signed ?? []).map((s) => s.signedUrl).filter((u): u is string => Boolean(u)));
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not load photos.");
  }
}
