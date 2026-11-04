import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { TradeInRequest } from "@/types/domain";
import { AppError } from "@/lib/errors";

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return createPublicClient();
  }
}

/**
 * Create a new trade-in valuation request.
 */
export async function createTradeInRequest(
  data: Omit<TradeInRequest, "id" | "created_at">
): Promise<TradeInRequest> {
  const supabase = getClient();

  const insertPayload = {
    user_id: data.user_id || null,
    lead_id: data.lead_id || null,
    make: data.make,
    model: data.model,
    year: data.year,
    km: data.km,
    fuel: (data.fuel || "Petrol") as any,
    transmission: (data.transmission || "Manual") as any,
    condition: data.condition,
    notes: data.notes || null,
    photos: (data.images || data.photos || []) as any,
  };

  const { data: row, error } = await supabase
    .from("trade_in_requests")
    .insert(insertPayload)
    .select("id, user_id, lead_id, make, model, year, km, condition, notes, photos, created_at")
    .single();

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to create trade-in request: ${error.message}`);
  }

  const photosList = Array.isArray(row.photos) ? (row.photos as string[]) : [];

  return {
    id: row.id,
    user_id: row.user_id,
    lead_id: row.lead_id,
    make: row.make,
    model: row.model,
    year: row.year,
    km: row.km,
    condition: row.condition as any,
    notes: row.notes || undefined,
    images: photosList,
    photos: photosList,
    created_at: row.created_at,
  };
}
