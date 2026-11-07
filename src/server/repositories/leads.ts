import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { Lead, LeadStatus, LeadSource } from "@/types/domain";
import { AppError } from "@/lib/errors";
import type { Database } from "@/types/database.types";

const LEAD_COLUMNS = `
  id,
  ref,
  source,
  user_id,
  name,
  phone,
  email,
  showroom_id,
  model_id,
  used_car_id,
  message,
  status,
  assigned_to,
  sla_due_at,
  first_contacted_at,
  ai_summary,
  ai_draft,
  consent_id,
  created_at,
  profiles:assigned_to (
    full_name
  ),
  models:model_id (
    name
  ),
  used_cars:used_car_id (
    model_name,
    stock_id
  )
`;

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return createPublicClient();
  }
}

function mapRowToLead(row: any): Lead {
  let modelName = "";
  if (row.models?.name) {
    modelName = row.models.name;
  } else if (row.used_cars?.model_name) {
    modelName = `Certified Used ${row.used_cars.model_name} (${row.used_cars.stock_id})`;
  }

  return {
    id: row.id,
    ref: row.ref ?? null,
    source: row.source as LeadSource,
    user_id: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    showroom_id: row.showroom_id,
    model_id: row.model_id,
    used_car_id: row.used_car_id,
    model_name: modelName,
    message: row.message,
    status: row.status as LeadStatus,
    assigned_to: row.assigned_to,
    assigned_consultant_name: row.profiles?.full_name || null,
    sla_due_at: row.sla_due_at,
    first_contacted_at: row.first_contacted_at,
    ai_summary: row.ai_summary,
    ai_draft: row.ai_draft,
    consent_id: row.consent_id,
    created_at: row.created_at,
  };
}

export interface ListLeadsParams {
  assignedTo?: string;
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
}

/**
 * List customer leads for sales desk and managers.
 */
export async function listLeads(params: ListLeadsParams = {}): Promise<Lead[]> {
  const supabase = getClient();
  let query = supabase
    .from("leads")
    .select(LEAD_COLUMNS);

  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status as LeadStatus);
  }
  if (params.source && params.source !== "all") {
    query = query.eq("source", params.source as LeadSource);
  }

  const limit = Math.min(params.limit || 100, 200);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to list leads: ${error.message}`);
  }

  let results = (data ?? []).map(mapRowToLead);

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    results = results.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.model_name && l.model_name.toLowerCase().includes(q))
    );
  }

  return results;
}

/**
 * Fetch a single lead by ID.
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch lead ${id}: ${error.message}`);
  }

  if (!data) return null;
  return mapRowToLead(data);
}

export interface LeadEventView {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  actor_name: string | null;
}

/**
 * Timeline of a lead (newest first), with the acting staff member's name.
 * Callers must already have authorised the viewer for this lead.
 */
export async function listLeadEvents(leadId: string): Promise<LeadEventView[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("lead_events")
    .select("id, type, payload, created_at, actor:actor_id ( full_name )")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to list lead events: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    created_at: row.created_at,
    actor_name: row.actor?.full_name ?? null,
  }));
}

/**
 * Create a new customer lead using database RPC create_lead.
 * Handles deduplication, auto-assignment, and SLA initiation.
 */
export async function createLead(data: {
  name: string;
  phone: string;
  email?: string | null;
  showroom_id: string;
  model_id?: string | null;
  used_car_id?: string | null;
  message?: string | null;
  source?: Lead["source"];
  consent_id?: string;
}): Promise<Lead> {
  const supabase = getClient();

  // Clean phone to E.164 Indian format if needed
  let cleanedPhone = data.phone.trim();
  if (!cleanedPhone.startsWith("+91")) {
    cleanedPhone = `+91${cleanedPhone.replace(/\D/g, "").slice(-10)}`;
  }

  const { data: leadRow, error } = await supabase.rpc("create_lead", {
    p_name: data.name,
    p_phone: cleanedPhone,
    p_showroom_id: data.showroom_id,
    p_model_id: data.model_id || undefined,
    p_used_car_id: data.used_car_id || undefined,
    p_email: data.email || undefined,
    p_message: data.message || undefined,
    p_source: (data.source as any) || "web",
    p_consent_id: data.consent_id || undefined,
  });

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to create lead: ${error.message}`);
  }

  // Fetch enriched lead with relations
  const fullLead = await getLeadById(leadRow.id);
  return fullLead || mapRowToLead(leadRow);
}

/**
 * Update the status of a lead (e.g. from new to contacted).
 */
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
  const supabase = getClient();

  const updates: Database["public"]["Tables"]["leads"]["Update"] = {
    status,
    status_changed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (status !== "new") {
    // If not contacted yet, set first_contacted_at
    const existing = await getLeadById(id);
    if (existing && !existing.first_contacted_at) {
      updates.first_contacted_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to update lead status: ${error.message}`);
  }

  return getLeadById(id);
}

/**
 * Reassign a lead to a specific consultant.
 */
export async function reassignLead(id: string, consultantId: string): Promise<Lead | null> {
  const supabase = getClient();

  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: consultantId,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to reassign lead: ${error.message}`);
  }

  return getLeadById(id);
}
