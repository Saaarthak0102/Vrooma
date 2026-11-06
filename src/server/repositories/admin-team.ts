import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

export interface RoutingRuleRow {
  id: string;
  showroom_id: string;
  showroom_name: string;
  model_id: string | null;
  model_name: string | null;
  priority: number;
  is_active: boolean;
  consultants: { id: string; name: string }[];
}

export interface StaffPoolMember {
  id: string;
  name: string;
  showroom_id: string;
}

/** Routing rules exactly as create_lead reads them, with human names. */
export async function listRoutingRules(): Promise<RoutingRuleRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assignment_rules")
    .select(
      "id, showroom_id, model_id, priority, is_active, showrooms:showroom_id ( name ), models:model_id ( name ), assignment_rule_consultants ( consultant_id, profiles:consultant_id ( full_name ) )"
    )
    .order("showroom_id", { ascending: true })
    .order("priority", { ascending: true })
    .limit(300);

  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to list routing rules: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    showroom_id: r.showroom_id,
    showroom_name: r.showrooms?.name ?? "Showroom",
    model_id: r.model_id ?? null,
    model_name: r.models?.name ?? null,
    priority: r.priority,
    is_active: r.is_active,
    consultants: (r.assignment_rule_consultants ?? []).map((c: any) => ({
      id: c.consultant_id as string,
      name: (c.profiles?.full_name as string) ?? "Consultant",
    })),
  }));
}

/** Active consultants and the showrooms they work at: the only people who may sit in a routing pool. */
export async function listStaffPool(): Promise<StaffPoolMember[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("staff_showrooms")
    .select("profile_id, showroom_id, profiles:profile_id ( full_name, role, is_active )")
    .limit(1000);

  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to list staff: ${error.message}`);

  return (data ?? [])
    .filter((r: any) => r.profiles?.role === "consultant" && r.profiles?.is_active !== false)
    .map((r: any) => ({
      id: r.profile_id as string,
      name: (r.profiles?.full_name as string) ?? "Consultant",
      showroom_id: r.showroom_id as string,
    }));
}
