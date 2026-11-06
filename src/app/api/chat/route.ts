import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/server/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 1000;

// Stub assistant for now; wired to a live model in a later phase.
function buildReply(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("model h") || text.includes("price")) {
    return "Official on-road prices come from our live price table and include the full road tax, insurance and charges breakup. Open the model page and sign in to see the exact figure for your city.";
  }
  if (text.includes("used") || text.includes("8 lakh")) {
    return "We currently have certified used cars like UC-1182 (Model C VX Diesel 2022) and UC-1190 (Model S LX 2021) available in Hazratganj, both 140-point inspected!";
  }
  return "Thank you for reaching out! Our Lucknow showroom consultant is available right now. Would you like to lock a test drive slot or view our full price breakup?";
}

// Best-effort throttle (per server instance): stops a single client from flooding the chat endpoint.
const chatHits = new Map<string, { count: number; resetAt: number }>();
const CHAT_WINDOW_MS = 60_000;
const CHAT_MAX_PER_WINDOW = 20;
const MAX_MESSAGES_PER_CONVERSATION = 200;

function allowChat(key: string): boolean {
  const now = Date.now();
  const hit = chatHits.get(key);
  if (!hit || now > hit.resetAt) {
    chatHits.set(key, { count: 1, resetAt: now + CHAT_WINDOW_MS });
    return true;
  }
  hit.count += 1;
  return hit.count <= CHAT_MAX_PER_WINDOW;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    if (!message) {
      return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
    }

    const viewer = await getViewer();
    const throttleKey = viewer.user?.id ?? `ip_${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
    if (!allowChat(throttleKey)) {
      return NextResponse.json(
        { ok: false, error: "You are sending messages too quickly. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const reply = buildReply(message);
    let conversationId: string | null = null;

    // Only signed-in buyers get their chats stored; guests still get a reply.
    if (viewer.isAuthenticated && viewer.user) {
      const admin = createAdminClient();
      const requestedId = typeof body?.conversationId === "string" && UUID_RE.test(body.conversationId) ? body.conversationId : null;

      if (requestedId) {
        const { data: owned } = await admin
          .from("chat_conversations")
          .select("id")
          .eq("id", requestedId)
          .eq("user_id", viewer.user.id)
          .maybeSingle();
        conversationId = owned?.id ?? null;

        // Cap the length of one conversation: past it, start a fresh one.
        if (conversationId) {
          const { count } = await admin
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conversationId);
          if ((count ?? 0) >= MAX_MESSAGES_PER_CONVERSATION) conversationId = null;
        }
      }

      if (!conversationId) {
        const title = message.length > 60 ? `${message.slice(0, 57)}...` : message;
        const { data: created, error: createErr } = await admin
          .from("chat_conversations")
          .insert({ user_id: viewer.user.id, title })
          .select("id")
          .single();
        if (createErr) console.warn(`[chat] Could not start conversation: ${createErr.message}`);
        conversationId = created?.id ?? null;
      }

      if (conversationId) {
        const now = Date.now();
        const { error: msgErr } = await admin.from("chat_messages").insert([
          { conversation_id: conversationId, role: "user", content: message, created_at: new Date(now).toISOString() },
          { conversation_id: conversationId, role: "assistant", content: reply, created_at: new Date(now + 1).toISOString() },
        ]);
        if (msgErr) console.warn(`[chat] Could not store messages: ${msgErr.message}`);
        await admin
          .from("chat_conversations")
          .update({ last_message_at: new Date(now + 1).toISOString() })
          .eq("id", conversationId);
      }
    }

    return NextResponse.json({
      ok: true,
      data: { reply, conversationId, mode: "mock_stub" },
    });
  } catch (err: any) {
    console.error("[api/chat] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Chat is unavailable right now. Please try again." }, { status: 500 });
  }
}
