import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { CarStatus, FuelType } from "@/types/domain";

/** A used car as the Used-Car Manager sees it: every status, masked registration only. */
export interface StockRow {
  id: string;
  stock_id: string;
  model_name: string;
  variant_name: string;
  fuel: FuelType;
  year: number;
  km: number;
  owners: number;
  price: number;
  status: CarStatus;
  reg_no_masked: string;
  certified: boolean;
  inspection_score: number | null;
  /** Raw inspection JSON; the scorecard lives under `scorecard`. */
  inspection: Record<string, unknown>;
  showroom_name: string | null;
  listed_at: string | null;
}

export interface TradeInRow {
  id: string;
  created_at: string;
  make: string;
  model: string;
  year: number;
  km: number;
  condition: string;
  notes: string | null;
  photo_count: number;
  lead_id: string | null;
  lead_ref: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  consultant_name: string | null;
  lead_status: string | null;
}

/** NEVER selects reg_no_private. The full plate is only reachable through the audited reveal RPC. */
export async function listStock(): Promise<StockRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("used_cars")
    .select(
      "id, stock_id, model_name, variant_name, fuel, year, km, owners, price, status, reg_no_masked, certified, inspection_score, inspection, listed_at, showrooms:showroom_id ( name )"
    )
    .order("status", { ascending: true })
    .order("listed_at", { ascending: false })
    .limit(500);

  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to list stock: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    stock_id: r.stock_id,
    model_name: r.model_name,
    variant_name: r.variant_name,
    fuel: r.fuel as FuelType,
    year: r.year,
    km: r.km,
    owners: r.owners,
    price: r.price,
    status: r.status as CarStatus,
    reg_no_masked: r.reg_no_masked,
    certified: Boolean(r.certified),
    inspection_score: r.inspection_score ?? null,
    inspection: (r.inspection ?? {}) as Record<string, unknown>,
    showroom_name: r.showrooms?.name ?? null,
    listed_at: r.listed_at ?? null,
  }));
}

export async function listTradeIns(): Promise<TradeInRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trade_in_requests")
    .select(
      "id, created_at, make, model, year, km, condition, notes, photos, lead_id, leads:lead_id ( ref, name, phone, status, profiles:assigned_to ( full_name ) )"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to list trade-ins: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    created_at: r.created_at,
    make: r.make,
    model: r.model,
    year: r.year,
    km: r.km,
    condition: r.condition,
    notes: r.notes ?? null,
    photo_count: Array.isArray(r.photos) ? r.photos.length : 0,
    lead_id: r.lead_id ?? null,
    lead_ref: r.leads?.ref ?? null,
    customer_name: r.leads?.name ?? null,
    customer_phone: r.leads?.phone ?? null,
    consultant_name: r.leads?.profiles?.full_name ?? null,
    lead_status: r.leads?.status ?? null,
  }));
}
