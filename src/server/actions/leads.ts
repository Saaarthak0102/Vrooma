"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { Lead, LeadStatus } from "@/types/domain";

import { FORBIDDEN_DISCOUNT_WORDS, findForbiddenDiscountWord } from "@/lib/validation/discount";

/**
 * Update lead status with optimistic concurrency protection.
 * Sets first_contacted_at automatically on transition from 'new'.
 */
export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
  lostReason?: string,
  expectedUpdatedAt?: string
): Promise<ActionResponse<{ id: string; status: LeadStatus; firstContactedAt?: string | null }>> {
  try {
    await requireRole("consultant", "manager", "admin");
    const admin = createAdminClient();
    const userClient = await createClient();

    // 1. Optimistic concurrency check
    if (expectedUpdatedAt) {
      const { data: currentLead } = await admin
        .from("leads")
        .select("updated_at, status")
        .eq("id", leadId)
        .single();

      if (currentLead && currentLead.updated_at !== expectedUpdatedAt) {
        return errorResponse(
          "CONFLICT",
          "This lead record was modified by another sales consultant. Please refresh to view the latest status."
        );
      }
    }

    // 2. Call set_lead_status RPC
    const { data: updated, error } = await (userClient || admin).rpc("set_lead_status", {
      p_lead_id: leadId,
      p_status: status,
      p_lost_reason: status === "lost" ? lostReason || "Not specified" : null,
    });

    if (error) {
      return errorResponse("INTERNAL_ERROR", `Failed to update lead status: ${error.message}`);
    }

    return successResponse({
      id: updated.id,
      status: updated.status as LeadStatus,
      firstContactedAt: updated.first_contacted_at,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Status update failed.");
  }
}

/**
 * Reassign a lead to another sales consultant in the showroom pool.
 */
export async function reassignLeadAction(
  leadId: string,
  toConsultantId: string,
  reason: string
): Promise<ActionResponse<{ id: string; assignedTo: string }>> {
  try {
    const { profile } = await requireRole("consultant", "manager", "admin");
    const admin = createAdminClient();
    const userClient = await createClient();

    if (!reason || reason.trim().length === 0) {
      return errorResponse("VALIDATION_FAILED", "A reason is required when reassigning a customer lead.");
    }

    // Verify target consultant exists and is active
    const { data: targetConsultant } = await admin
      .from("profiles")
      .select("id, full_name, email, is_active, role")
      .eq("id", toConsultantId)
      .maybeSingle();

    if (!targetConsultant || !targetConsultant.is_active) {
      return errorResponse("NOT_FOUND", "Selected consultant is inactive or was not found.");
    }

    // Call reassign_lead RPC
    const { data: lead, error } = await (userClient || admin).rpc("reassign_lead", {
      p_lead_id: leadId,
      p_to_consultant_id: toConsultantId,
      p_reason: reason.trim(),
    });

    if (error) {
      return errorResponse("INTERNAL_ERROR", `Failed to reassign lead: ${error.message}`);
    }

    // A support chat linked to this lead moves with it, so the new consultant sees the conversation.
    try {
      await (admin as any).from("chat_conversations").update({ assigned_to: toConsultantId }).eq("lead_id", leadId);
    } catch (chatErr: any) {
      console.warn(`[leads] Chat reassignment error: ${chatErr?.message}`);
    }

    // Queue notification to new consultant
    try {
      await admin.from("messages_outbox").insert({
        channel: "email",
        // Tell the consultant who now owns the lead; fall back to the shared desk only if they have no email.
        to_address: targetConsultant.email || "staff@vrooma.in",
        template: "lead_reassigned",
        body: `Lead ${lead.ref} has been reassigned to you (${targetConsultant.full_name}) by ${profile.full_name}. Reason: ${reason}`,
        lead_id: leadId,
        // Stable per lead + target: a double click cannot send two emails.
        idempotency_key: `outbox_reassign_${leadId}_${toConsultantId}`,
        status: "pending",
      });
    } catch (outboxErr: any) {
      console.warn(`[leads] Outbox write error: ${outboxErr?.message}`);
    }

    return successResponse({
      id: lead.id,
      assignedTo: toConsultantId,
    });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Reassignment failed.");
  }
}

/**
 * Send a reply message to the buyer.
 * Enforces strict dealership policy: discount words are forbidden in drafts and replies.
 */
export async function sendLeadReplyAction(
  leadId: string,
  message: string,
  channel: "whatsapp" | "email" | "sms" = "whatsapp"
): Promise<ActionResponse<{ messageId: string; statusUpdated: boolean }>> {
  try {
    const { profile } = await requireRole("consultant", "manager", "admin");
    const admin = createAdminClient();

    if (!message || message.trim().length === 0) {
      return errorResponse("VALIDATION_FAILED", "Message cannot be empty.");
    }

    // Dealership policy constraint: discount words are hard-blocked
    // Same function as the editor warning in ReplyDraftEditor (see docs/backend/DISCOUNT_RULES.md)
    if (findForbiddenDiscountWord(message) !== null) {
      return errorResponse(
        "VALIDATION_FAILED",
        "Dealership Policy Guardrail: Reply cannot quote discounts, price cuts, or waivers. All pricing adjustments must go through the Dealer Principal or Used-Car Manager."
      );
    }

    // Fetch lead details
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, ref, name, phone, email, status, showroom_id, assigned_to, ai_draft")
      .eq("id", leadId)
      .single();

    // 404 for both "missing" and "someone else's lead" so existence is not revealed to other consultants
    if (leadErr || !lead || (profile.role === "consultant" && lead.assigned_to !== profile.id)) {
      return errorResponse("NOT_FOUND", "Lead record not found.");
    }

    const destination = channel === "email" ? (lead.email || lead.phone) : lead.phone;

    // Queue in messages_outbox
    const msgId = `reply_${lead.id}_${Date.now()}`;
    const { error: outboxErr } = await admin.from("messages_outbox").insert({
      channel,
      to_address: destination,
      template: "consultant_reply",
      body: message.trim(),
      lead_id: lead.id,
      idempotency_key: msgId,
      status: "pending",
    });

    if (outboxErr) {
      return errorResponse("INTERNAL_ERROR", `Failed to queue message: ${outboxErr.message}`);
    }

    // Record lead event
    await admin.from("lead_events").insert({
      lead_id: lead.id,
      type: "contacted",
      actor_id: profile.id,
      payload: {
        channel,
        sender: profile.full_name,
        message_length: message.length,
      },
    });

    // Audit trail for /admin/ai-logs: prompt = the AI draft, response = what the consultant actually sent.
    // Never blocks the reply if the log write fails.
    if (lead.ai_draft) {
      const { error: logErr } = await admin.from("ai_logs").insert({
        lead_id: lead.id,
        action: message.trim() === lead.ai_draft.trim() ? "reply_sent_unedited" : "reply_sent_edited",
        prompt: lead.ai_draft,
        response: message.trim(),
      });
      if (logErr) console.warn(`[leads] ai_logs write failed: ${logErr.message}`);
    }

    // If lead was still 'new', update to 'contacted'
    // IMPORTANT: call as the signed-in consultant. The RPC checks private.is_staff() and lead ownership
    // from auth.uid(); through the admin (service-role) client auth.uid() is NULL, the call is refused, and
    // the lead would stay 'new' with the SLA timer running after the buyer was already answered.
    let statusUpdated = true;
    if (lead.status === "new") {
      const userClient = await createClient();
      const { error: statusErr } = await (userClient ?? admin).rpc("set_lead_status", {
        p_lead_id: lead.id,
        p_status: "contacted",
      });
      if (statusErr) {
        console.warn(`[leads] Reply sent but status update failed: ${statusErr.message}`);
        statusUpdated = false;
      }
    }

    return successResponse({ messageId: msgId, statusUpdated });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to send reply.");
  }
}

