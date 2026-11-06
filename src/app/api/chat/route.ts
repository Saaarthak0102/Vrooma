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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    if (!message) {
      return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
    }

    const reply = buildReply(message);
    let conversationId: string | null = null;

    // Only signed-in buyers get their chats stored; guests still get a reply.
    const viewer = await getViewer();
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
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
