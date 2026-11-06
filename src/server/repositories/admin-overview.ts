import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

/** The few lead/booking columns the Dealer Principal's charts need. No personal data leaves the server. */
export interface OverviewLead {
  status: string;
  created_at: string;
  sla_due_at: string;
  first_contacted_at: string | null;
  consultant: string;
}

export interface OverviewBooking {
  kind: string;
  status: string;
  created_at: string;
}

export const OVERVIEW_MAX_DAYS = 90;

export async function loadOverviewData(): Promise<{ leads: OverviewLead[]; bookings: OverviewBooking[] }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - OVERVIEW_MAX_DAYS * 86_400_000).toISOString();

  const [leads, bookings] = await Promise.all([
    admin
      .from("leads")
      .select("status, created_at, sla_due_at, first_contacted_at, profiles:assigned_to ( full_name )")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    admin
      .from("bookings")
      .select("kind, status, created_at")
      .neq("status", "cancelled")
      .gte("created_at", since)
      .limit(5000),
  ]);

  if (leads.error) throw new AppError("INTERNAL_ERROR", 500, `Failed to load lead overview: ${leads.error.message}`);
  if (bookings.error) throw new AppError("INTERNAL_ERROR", 500, `Failed to load booking overview: ${bookings.error.message}`);

  return {
    leads: (leads.data ?? []).map((r: any) => ({
      status: r.status,
      created_at: r.created_at,
      sla_due_at: r.sla_due_at,
      first_contacted_at: r.first_contacted_at ?? null,
      consultant: r.profiles?.full_name || "Unassigned",
    })),
    bookings: (bookings.data ?? []).map((r: any) => ({ kind: r.kind, status: r.status, created_at: r.created_at })),
  };
}

/** Enquiries per car model in the last 90 days: what buyers actually ask about, to compare with what is listed. */
export async function loadModelDemand(): Promise<Array<{ model: string; count: number }>> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - OVERVIEW_MAX_DAYS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("leads")
    .select("models:model_id ( name )")
    .not("model_id", "is", null)
    .gte("created_at", since)
    .limit(5000);
  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to load model demand: ${error.message}`);

  const counts = new Map<string, number>();
  for (const r of (data ?? []) as any[]) {
    const name = r.models?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count);
}

/** Open (not won/lost) leads per consultant right now: the load the routing rules are balancing. */
export async function loadOpenLeadLoad(): Promise<Array<{ consultant: string; count: number }>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leads")
    .select("profiles:assigned_to ( full_name )")
    .not("status", "in", "(won,lost)")
    .limit(5000);
  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to load lead load: ${error.message}`);

  const counts = new Map<string, number>();
  for (const r of (data ?? []) as any[]) {
    const name = r.profiles?.full_name || "Unassigned";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([consultant, count]) => ({ consultant, count })).sort((a, b) => b.count - a.count);
}
