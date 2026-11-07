"use server";

import { requireRole } from "@/server/auth/viewer";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";
import {
  getConversation,
  insertMessages,
  listMessages,
  updateConversation,
  type ChatConversation,
  type ChatMessage,
} from "@/server/repositories/chats";
import { resolveConversation } from "@/server/services/chat-handoff";

const MAX_REPLY_LENGTH = 1000;

export interface ChatDetail {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

/** A consultant only sees chats assigned to them; anything else reads as "not found". */
async function loadAllowed(id: string): Promise<{ conv: ChatConversation; userId: string; role: string } | null> {
  const { user, profile } = await requireRole("consultant", "manager", "admin");
  const conv = await getConversation(id);
  if (!conv || !conv.handoff_at) return null;
  if (profile.role === "consultant" && conv.assigned_to !== user.id) return null;
  return { conv, userId: user.id, role: profile.role };
}

export async function getChatDetailAction(id: string): Promise<ActionResponse<ChatDetail>> {
  try {
    const allowed = await loadAllowed(id);
    if (!allowed) return errorResponse("NOT_FOUND", "Chat not found.");
    const messages = await listMessages(id);
    return successResponse({ conversation: allowed.conv, messages });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not open the chat.");
  }
}

/** Newer messages for the open chat (polling fallback for the side panel). */
export async function pollChatAction(
  id: string,
  since: string | null
): Promise<ActionResponse<{ status: ChatConversation["status"]; messages: ChatMessage[] }>> {
  try {
    const allowed = await loadAllowed(id);
    if (!allowed) return errorResponse("NOT_FOUND", "Chat not found.");
    const messages = await listMessages(id, since);
    return successResponse({ status: allowed.conv.status, messages });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not refresh the chat.");
  }
}

/** Consultant reply. Same rule as every other buyer message: no discounts, price cuts or waivers. */
export async function sendChatReplyAction(id: string, text: string): Promise<ActionResponse<{ message: ChatMessage }>> {
  try {
    const allowed = await loadAllowed(id);
    if (!allowed) return errorResponse("NOT_FOUND", "Chat not found.");
    if (allowed.conv.status === "resolved") {
      return errorResponse("VALIDATION_FAILED", "This chat is closed.");
    }
    const content = (text ?? "").trim().slice(0, MAX_REPLY_LENGTH);
    if (!content) return errorResponse("VALIDATION_FAILED", "Type a reply first.");

    const forbidden = findForbiddenDiscountWord(content);
    if (forbidden) {
      return errorResponse(
        "VALIDATION_FAILED",
        `Replies cannot mention "${forbidden}". Prices and offers come from the admin tables only.`
      );
    }

    const [message] = await insertMessages(id, [{ role: "consultant", content, senderId: allowed.userId }]);
    if (!message) return errorResponse("INTERNAL_ERROR", "Could not send the reply.");

    const patch: Record<string, unknown> = { status: "live" };
    if (!allowed.conv.first_staff_reply_at) patch.first_staff_reply_at = new Date().toISOString();
    await updateConversation(id, patch);

    return successResponse({ message });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not send the reply.");
  }
}

export async function resolveChatAction(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const allowed = await loadAllowed(id);
    if (!allowed) return errorResponse("NOT_FOUND", "Chat not found.");
    if (allowed.conv.status !== "resolved") await resolveConversation(id, "consultant");
    return successResponse({ id });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Could not close the chat.");
  }
}
