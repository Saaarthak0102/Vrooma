"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";

const stockIdSchema = z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/, "Invalid stock id");

/**
 * Reveal the unmasked registration number of a used car to STAFF.
 *
 * - App layer: signed-in consultant, manager or admin with a completed profile (buyers are refused here).
 * - DB layer: the get_used_car_reg RPC runs with the USER'S session (never the admin client), checks
 *   private.is_staff() itself, and writes a VIEW_UNMASKED_REG row to audit_log with actor = auth.uid().
 * The value is returned to the caller only; it is never cached or logged by the app.
 */
export async function revealUsedCarRegAction(stockId: string): Promise<ActionResponse<{ reg: string }>> {
  const parsed = stockIdSchema.safeParse(stockId);
  if (!parsed.success) return errorResponse("VALIDATION_FAILED", "Invalid stock id.");

  try {
    await requireRole("consultant", "manager", "admin");
  } catch (err: any) {
    return errorResponse(err?.code === "UNAUTHORIZED" ? "UNAUTHORIZED" : "FORBIDDEN", "Staff access required.");
  }

  const supabase = await createClient();
  if (!supabase) return errorResponse("INTERNAL_ERROR", "Database unavailable.");

  const { data, error } = await supabase.rpc("get_used_car_reg", { p_stock_id: parsed.data });
  if (error) {
    if (error.code === "VR005") return errorResponse("FORBIDDEN", "Staff access required.");
    if (error.code === "VR007") return errorResponse("NOT_FOUND", "Vehicle not found.");
    return errorResponse("INTERNAL_ERROR", "Could not reveal registration number.");
  }
  return successResponse({ reg: data as string });
}
