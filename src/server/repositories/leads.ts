import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Lead, LeadStatus } from "@/types/domain";
import { SLA_SECONDS } from "@/lib/constants";
import { assignConsultant } from "@/server/services/lead-assignment";

export interface ListLeadsParams {
  assignedTo?: string;
  status?: string;
  source?: string;
  search?: string;
}

export async function listLeads(params: ListLeadsParams = {}): Promise<Lead[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    let leads = [...memoryStore.leads];

    if (params.assignedTo) {
      leads = leads.filter((l) => l.assigned_to === params.assignedTo);
    }
    if (params.status && params.status !== "all") {
      leads = leads.filter((l) => l.status === params.status);
    }
    if (params.source && params.source !== "all") {
      leads = leads.filter((l) => l.source === params.source);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.model_name && l.model_name.toLowerCase().includes(q))
      );
    }

    // Sort by created_at desc
    leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return leads;
  }

  throw new Error("TODO(day-4): Supabase listLeads not implemented yet");
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return memoryStore.leads.find((l) => l.id === id) ?? null;
  }
  throw new Error("TODO(day-4): Supabase getLeadById not implemented yet");
}

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
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const now = new Date();
    const slaDue = new Date(now.getTime() + SLA_SECONDS * 1000);

    // Auto-assignment
    const assignedConsultant = assignConsultant({
      showroomId: data.showroom_id,
      modelId: data.model_id,
    });

    // Model name lookup
    let modelName = "";
    if (data.model_id) {
      const m = memoryStore.models.find((model) => model.id === data.model_id);
      if (m) modelName = m.name;
    } else if (data.used_car_id) {
      const uc = memoryStore.usedCars.find((c) => c.id === data.used_car_id);
      if (uc) modelName = `Certified Used ${uc.model_name} (${uc.stock_id})`;
    }

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      source: data.source ?? "web",
      name: data.name,
      phone: data.phone,
      email: data.email,
      showroom_id: data.showroom_id,
      model_id: data.model_id,
      used_car_id: data.used_car_id,
      model_name: modelName,
      message: data.message,
      status: "new",
      assigned_to: assignedConsultant?.id ?? null,
      assigned_consultant_name: assignedConsultant?.full_name ?? null,
      sla_due_at: slaDue.toISOString(),
      first_contacted_at: null,
      ai_summary: `Web enquiry received for ${modelName || "vehicle line"}. Customer phone verified with DPDP consent.`,
      ai_draft: `Namaste ${data.name}, thank you for choosing Vrooma. Our showroom specialist ${assignedConsultant?.full_name || ""} will assist you with pricing and test drives.`,
      consent_id: data.consent_id ?? `consent-${Date.now()}`,
      created_at: now.toISOString(),
    };

    return memoryStore.addLead(newLead);
  }

  throw new Error("TODO(day-4): Supabase createLead not implemented yet");
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const updates: Partial<Lead> = { status };
    if (status !== "new" && !memoryStore.leads.find((l) => l.id === id)?.first_contacted_at) {
      updates.first_contacted_at = new Date().toISOString();
    }
    return memoryStore.updateLead(id, updates);
  }
  throw new Error("TODO(day-4): Supabase updateLeadStatus not implemented yet");
}

export async function reassignLead(id: string, consultantId: string): Promise<Lead | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const consultant = memoryStore.users.find((u) => u.id === consultantId);
    return memoryStore.updateLead(id, {
      assigned_to: consultantId,
      assigned_consultant_name: consultant ? consultant.full_name : null,
    });
  }
  throw new Error("TODO(day-4): Supabase reassignLead not implemented yet");
}
