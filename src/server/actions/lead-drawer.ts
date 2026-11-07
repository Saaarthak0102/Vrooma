"use server";

import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { getLeadById, listLeadEvents, type LeadEventView } from "@/server/repositories/leads";
import { listUsers } from "@/server/repositories/users";
import { findConversationForLead } from "@/server/repositories/chats";
import { ensureLeadCopilot } from "@/server/services/lead-copilot-persist";
import type { Lead, Profile } from "@/types/domain";

export interface LeadDrawerData {
  lead: Lead;
  events: LeadEventView[];
  /** Active consultants a lead can be reassigned to. */
  consultants: Profile[];
  /** Support chat that created or belongs to this lead, if any. */
  chatId: string | null;
}

/**
 * Everything the Lead Desk drawer needs for one lead.
 * A consultant can only open their own leads; anything else reads as "not found" so existence is not revealed.
 * Opening a lead also makes sure it carries an AI summary and a first-reply draft.
 */
export async function getLeadDrawerAction(leadId: string): Promise<ActionResponse<LeadDrawerData>> {
  try {
    const { user, profile } = await requireRole("consultant", "manager", "admin");
    const raw = await getLeadById(leadId);

    if (!raw || (profile.role === "consultant" && raw.assigned_to !== user.id)) {
      return errorResponse("NOT_FOUND", "Lead not found.");
    }

    const [lead, events, consultants, chat] = await Promise.all([
      ensureLeadCopilot(raw),
      listLeadEvents(raw.id),
      listUsers("consultant"),
      findConversationForLead(raw.id),
    ]);

    return successResponse({
      lead,
      events,
      consultants: consultants.filter((c) => c.is_active !== false),
      chatId: chat?.id ?? null,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not load the lead.");
  }
}
