import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getViewer } from "@/server/auth/viewer";
import { buildBotReply, CLOSING_REPLIES, detectIntent, type QuickReply } from "@/server/ai/support-bot";
import {
  countMessages,
  createConversation,
  findOwnedConversation,
  insertMessages,
  listMessages,
  updateConversation,
  type ChatConversation,
  type ChatMessage,
} from "@/server/repositories/chats";
import { requestHandoff } from "@/server/services/chat-handoff";
import { normalizeIndianPhone } from "@/lib/phone";
import { getTrustedClientIp } from "@/lib/network";
import { rateLimit } from "@/server/security/rate-limit";
import { guardOrigin } from "@/server/auth/api-guard";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 1000;

const CHAT_MAX_PER_MINUTE = 20;
const MAX_MESSAGES_PER_CONVERSATION = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function view(conv: ChatConversation) {
  return {
    status: conv.status,
    consultantName: conv.assigned_name,
    leadRef: conv.lead_ref,
  };
}

/**
 * Buyer chat turn.
 * - status "bot": the rule-based assistant answers and ends with "solved, or connect to a consultant?".
 * - "waiting" / "live": the buyer's message is stored for the consultant; no bot reply.
 * - "resolved": a fresh conversation starts.
 * Body: { message?, action?: "solved" | "connect", conversationId?, guestToken? }
 */
export async function POST(request: NextRequest) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const action = body?.action === "solved" || body?.action === "connect" ? (body.action as "solved" | "connect") : null;
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    if (!message && !action) {
      return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
    }

    const viewer = await getViewer();
    const ip = getTrustedClientIp(request);
    const throttleKey = viewer.user?.id ?? `ip_${ip}`;
    if (!(await rateLimit(`chat_${throttleKey}`, CHAT_MAX_PER_MINUTE, 60))) {
      return NextResponse.json(
        { ok: false, error: "You are sending messages too quickly. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Owner: the signed-in buyer, otherwise a guest token (issued here, kept by the widget).
    const userId = viewer.isAuthenticated && viewer.user ? viewer.user.id : null;
    let guestToken: string | null = null;
    if (!userId) {
      guestToken = typeof body?.guestToken === "string" && UUID_RE.test(body.guestToken) ? body.guestToken : randomUUID();
    }

    const requestedId = typeof body?.conversationId === "string" && UUID_RE.test(body.conversationId) ? body.conversationId : null;
    let conv: ChatConversation | null = requestedId ? await findOwnedConversation(requestedId, { userId, guestToken }) : null;

    // A closed chat, or one past the length cap, is replaced by a fresh conversation.
    if (conv && (conv.status === "resolved" || (await countMessages(conv.id)) >= MAX_MESSAGES_PER_CONVERSATION)) {
      conv = null;
    }
    if (!conv) {
      const title = (message || "Support chat").length > 60 ? `${message.slice(0, 57)}...` : message || "Support chat";
      const id = await createConversation({ userId, guestToken, title });
      if (!id) {
        return NextResponse.json({ ok: false, error: "Chat is unavailable right now. Please try again." }, { status: 503 });
      }
      conv = await findOwnedConversation(id, { userId, guestToken });
      if (!conv) {
        return NextResponse.json({ ok: false, error: "Chat is unavailable right now. Please try again." }, { status: 503 });
      }
    }

    // Every message stored during this turn goes back to the widget (with ids, so polling can de-duplicate).
    const out: ChatMessage[] = [];
    const store = async (msgs: Array<{ role: ChatMessage["role"]; content: string }>) => {
      out.push(...(await insertMessages(conv!.id, msgs)));
    };

    const respond = (extra: Record<string, unknown>) =>
      NextResponse.json({
        ok: true,
        data: {
          conversationId: conv!.id,
          guestToken,
          ...view(conv!),
          messages: out.map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })),
          ...extra,
        },
      });

    // ---- Live chat: store the buyer's message, the consultant answers. ----
    if (conv.status === "waiting" || conv.status === "live") {
      if (action === "solved") {
        await updateConversation(conv.id, { status: "resolved", resolved_at: new Date().toISOString(), resolved_by: "buyer" });
        await store([{ role: "system", content: "The buyer closed this chat." }]);
        conv = (await findOwnedConversation(conv.id, { userId, guestToken })) ?? conv;
        return respond({ reply: null, quickReplies: [] as QuickReply[], needsContact: false });
      }
      if (message) await store([{ role: "user", content: message }]);
      return respond({ reply: null, quickReplies: [] as QuickReply[], needsContact: false });
    }

    // ---- Bot stage ----
    const intent = action === "solved" ? "solved" : action === "connect" ? "handoff" : detectIntent(message);

    if (message && !action) await store([{ role: "user", content: message }]);
    if (action === "connect") await store([{ role: "user", content: "Connect me to a consultant" }]);
    if (action === "solved") await store([{ role: "user", content: "Yes, it's solved" }]);

    if (intent === "solved") {
      const bot = buildBotReply("solved");
      await store([{ role: "assistant", content: bot.reply }]);
      await updateConversation(conv.id, { status: "resolved", resolved_at: new Date().toISOString(), resolved_by: "buyer" });
      conv = (await findOwnedConversation(conv.id, { userId, guestToken })) ?? conv;
      return respond({ reply: bot.reply, quickReplies: [], needsContact: false });
    }

    if (intent === "handoff") {
      // A signed-in buyer with a saved name and mobile number is connected straight away.
      const phone = viewer.profile?.phone ? normalizeIndianPhone(viewer.profile.phone) : null;
      if (userId && viewer.profile?.full_name && phone) {
        const res = await requestHandoff({
          conversationId: conv.id,
          contact: { name: viewer.profile.full_name, phone, email: viewer.user?.email || null },
          userId,
          ipAddress: ip,
        });
        if ("error" in res) {
          return respond({ notice: res.error, quickReplies: CLOSING_REPLIES, needsContact: false });
        }
        conv = res.conversation;
        out.push(...(await listMessages(conv.id, new Date(Date.now() - 10_000).toISOString())).filter((m) => m.role === "system"));
        return respond({ reply: null, quickReplies: [], needsContact: false });
      }
      const reply = "Happy to connect you. Please share your name and mobile number so your consultant can reach you.";
      await store([{ role: "assistant", content: reply }]);
      return respond({ reply, quickReplies: [], needsContact: true });
    }

    const bot = buildBotReply(message);
    await store([{ role: "assistant", content: bot.reply }]);
    return respond({ reply: bot.reply, quickReplies: bot.quickReplies, needsContact: false });
  } catch (err: any) {
    console.error("[api/chat] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Chat is unavailable right now. Please try again." }, { status: 500 });
  }
}
