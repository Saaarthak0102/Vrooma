import { createAdminClient } from "@/lib/supabase/admin";
import { recordConsent } from "@/server/privacy/consent";
import { listShowrooms } from "@/server/repositories/showrooms";
import { buildChatContext } from "@/server/ai/chat-context";
import {
  getConversation,
  insertMessages,
  listMessages,
  updateConversation,
  type ChatConversation,
} from "@/server/repositories/chats";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const HANDOFF_CONSENT_TEXT =
  "I consent to Vrooma contacting me about my enquiry and processing my chat and contact details under the DPDP Act 2023.";

export interface HandoffContact {
  name: string;
  /** Normalised +91XXXXXXXXXX */
  phone: string;
  email?: string | null;
}

export interface HandoffResult {
  conversation: ChatConversation;
  consultantName: string | null;
  leadRef: string | null;
}

/**
 * Escalate a bot chat to a human. Creates a real lead (source "chat") through create_lead, so the existing
 * showroom/model routing, the 5-minute SLA and the lead timeline all apply, then links the chat to that lead,
 * stores the AI context for the consultant and posts a system message. Idempotent: a chat that is already
 * handed off returns as it is.
 */
export async function requestHandoff(params: {
  conversationId: string;
  contact: HandoffContact;
  userId?: string | null;
  ipAddress?: string | null;
}): Promise<HandoffResult | { error: string }> {
  const existing = await getConversation(params.conversationId);
  if (!existing) return { error: "Chat not found." };
  if (existing.status === "waiting" || existing.status === "live") {
    return { conversation: existing, consultantName: existing.assigned_name, leadRef: existing.lead_ref };
  }

  const admin = createAdminClient();
  const messages = await listMessages(existing.id);
  const buyerMessages = messages.filter((m) => m.role === "user").map((m) => m.content);

  const showrooms = await listShowrooms();
  const showroomId = showrooms.find((s) => UUID_RE.test(s.id))?.id;
  if (!showroomId) return { error: "No showroom is available right now. Please try again shortly." };

  let consentId: string | null = null;
  try {
    consentId = await recordConsent({
      userId: params.userId ?? null,
      email: params.contact.email ?? null,
      phone: params.contact.phone,
      purpose: "lead_contact",
      granted: true,
      source: "enquiry",
      consentText: HANDOFF_CONSENT_TEXT,
      ipAddress: params.ipAddress ?? null,
    });
  } catch {
    return { error: "We could not record your consent. Please try again." };
  }

  const context = buildChatContext({
    buyerMessages,
    buyerName: params.contact.name,
    signedIn: Boolean(params.userId),
    totalMessages: messages.length,
  });

  const { data: lead, error } = await admin.rpc("create_lead", {
    p_name: params.contact.name,
    p_phone: params.contact.phone,
    p_email: params.contact.email ?? null,
    p_showroom_id: showroomId,
    p_message: `Chat handoff. ${context.summary}${context.lastQuestion ? ` Last question: "${context.lastQuestion}"` : ""}`.slice(0, 1000),
    p_source: "chat",
    p_source_ref: existing.id,
    p_consent_id: consentId,
    p_user_id: params.userId ?? null,
  });
  if (error || !lead) return { error: "We could not reach a consultant right now. Please try again." };

  const assignedTo: string | null = lead.assigned_to ?? null;
  let consultantName: string | null = null;
  if (assignedTo) {
    const { data: consultant } = await admin.from("profiles").select("full_name").eq("id", assignedTo).maybeSingle();
    consultantName = consultant?.full_name ?? null;
  }

  // Keep the AI summary on the lead too, so the Lead Desk drawer shows the same context.
  await admin
    .from("leads")
    .update({ ai_summary: context.summary, ai_draft: context.suggestedReply })
    .eq("id", lead.id);

  await updateConversation(existing.id, {
    status: "waiting",
    lead_id: lead.id,
    assigned_to: assignedTo,
    ai_context: context,
    handoff_at: new Date().toISOString(),
  });

  await admin.from("lead_events").insert({
    lead_id: lead.id,
    type: "note_added",
    payload: { note: "Buyer asked for a consultant from the support chat.", conversation_id: existing.id },
    actor_id: null,
  });

  await insertMessages(existing.id, [
    {
      role: "system",
      content: consultantName
        ? `You are connected with ${consultantName}. They will reply here shortly.`
        : "A consultant will reply here shortly.",
    },
  ]);

  const updated = (await getConversation(existing.id)) ?? existing;
  return { conversation: updated, consultantName, leadRef: (lead as { ref?: string }).ref ?? null };
}

/** Close a chat. `by` is who ended it. Adds a system line so both sides see it. */
export async function resolveConversation(conversationId: string, by: "buyer" | "consultant"): Promise<void> {
  await updateConversation(conversationId, {
    status: "resolved",
    resolved_at: new Date().toISOString(),
    resolved_by: by,
  });
  await insertMessages(conversationId, [
    { role: "system", content: by === "buyer" ? "The buyer closed this chat." : "This chat was closed by your consultant." },
  ]);
}
