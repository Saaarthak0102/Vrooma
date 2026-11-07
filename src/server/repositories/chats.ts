import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatAiContext } from "@/server/ai/chat-context";

export type ChatStatus = "bot" | "waiting" | "live" | "resolved";
export type ChatRole = "user" | "assistant" | "consultant" | "system";

export interface ChatConversation {
  id: string;
  user_id: string | null;
  guest_token: string | null;
  title: string;
  status: ChatStatus;
  lead_id: string | null;
  lead_ref: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  ai_context: Partial<ChatAiContext>;
  created_at: string;
  last_message_at: string;
  handoff_at: string | null;
  first_staff_reply_at: string | null;
  resolved_at: string | null;
  resolved_by: "buyer" | "consultant" | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  sender_id: string | null;
  created_at: string;
}

// The chat columns are newer than the generated Supabase types, so these queries are loosely typed.
const db = (): any => createAdminClient();

const CONVERSATION_SELECT =
  "id, user_id, guest_token, title, status, lead_id, assigned_to, ai_context, created_at, last_message_at, handoff_at, first_staff_reply_at, resolved_at, resolved_by, lead:lead_id ( ref, name, phone ), consultant:assigned_to ( full_name )";

function mapConversation(row: any): ChatConversation {
  return {
    id: row.id,
    user_id: row.user_id,
    guest_token: row.guest_token,
    title: row.title,
    status: row.status,
    lead_id: row.lead_id,
    lead_ref: row.lead?.ref ?? null,
    assigned_to: row.assigned_to,
    assigned_name: row.consultant?.full_name ?? null,
    buyer_name: row.lead?.name ?? row.ai_context?.buyerName ?? null,
    buyer_phone: row.lead?.phone ?? null,
    ai_context: row.ai_context ?? {},
    created_at: row.created_at,
    last_message_at: row.last_message_at,
    handoff_at: row.handoff_at,
    first_staff_reply_at: row.first_staff_reply_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
  };
}

/** Buyer-side lookup: the conversation only if it belongs to this user or guest token. */
export async function findOwnedConversation(
  id: string,
  owner: { userId?: string | null; guestToken?: string | null }
): Promise<ChatConversation | null> {
  let query = db().from("chat_conversations").select(CONVERSATION_SELECT).eq("id", id);
  if (owner.userId) query = query.eq("user_id", owner.userId);
  else if (owner.guestToken) query = query.eq("guest_token", owner.guestToken);
  else return null;
  const { data } = await query.maybeSingle();
  return data ? mapConversation(data) : null;
}

export async function getConversation(id: string): Promise<ChatConversation | null> {
  const { data } = await db().from("chat_conversations").select(CONVERSATION_SELECT).eq("id", id).maybeSingle();
  return data ? mapConversation(data) : null;
}

export async function createConversation(input: {
  userId?: string | null;
  guestToken?: string | null;
  title: string;
}): Promise<string | null> {
  const { data, error } = await db()
    .from("chat_conversations")
    .insert({ user_id: input.userId ?? null, guest_token: input.guestToken ?? null, title: input.title })
    .select("id")
    .single();
  if (error) console.warn(`[chat] Could not start conversation: ${error.message}`);
  return data?.id ?? null;
}

export async function countMessages(conversationId: string): Promise<number> {
  const { count } = await db()
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  return count ?? 0;
}

export async function insertMessages(
  conversationId: string,
  messages: Array<{ role: ChatRole; content: string; senderId?: string | null }>
): Promise<ChatMessage[]> {
  const base = Date.now();
  const rows = messages.map((m, i) => ({
    conversation_id: conversationId,
    role: m.role,
    content: m.content,
    sender_id: m.senderId ?? null,
    created_at: new Date(base + i).toISOString(),
  }));
  const { data, error } = await db().from("chat_messages").insert(rows).select("*");
  if (error) {
    console.warn(`[chat] Could not store messages: ${error.message}`);
    return [];
  }
  await db()
    .from("chat_conversations")
    .update({ last_message_at: new Date(base + rows.length - 1).toISOString() })
    .eq("id", conversationId);
  return data as ChatMessage[];
}

export async function listMessages(conversationId: string, since?: string | null): Promise<ChatMessage[]> {
  let query = db()
    .from("chat_messages")
    .select("id, conversation_id, role, content, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (since) query = query.gt("created_at", since);
  const { data } = await query;
  return (data ?? []) as ChatMessage[];
}

export async function updateConversation(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db().from("chat_conversations").update(patch).eq("id", id);
  if (error) console.warn(`[chat] Could not update conversation: ${error.message}`);
}

/** Staff list. Consultants only see chats assigned to them; managers and admins see every handed-off chat. */
export async function listStaffConversations(scope: { assignedTo?: string }): Promise<ChatConversation[]> {
  let query = db()
    .from("chat_conversations")
    .select(CONVERSATION_SELECT)
    .in("status", ["waiting", "live", "resolved"])
    .not("handoff_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(300);
  if (scope.assignedTo) query = query.eq("assigned_to", scope.assignedTo);
  const { data } = await query;
  return (data ?? []).map(mapConversation);
}

/** The chat linked to a lead, if one was handed off (for the lead drawer's "View chat" link). */
export async function findConversationForLead(leadId: string): Promise<{ id: string; status: ChatStatus } | null> {
  const { data } = await db()
    .from("chat_conversations")
    .select("id, status")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
