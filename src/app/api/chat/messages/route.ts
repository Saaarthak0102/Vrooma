import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/server/auth/viewer";
import { findOwnedConversation, listMessages } from "@/server/repositories/chats";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Buyer-side polling fallback for the live chat: messages (and status) newer than `since`.
 * Only the owner (signed-in buyer or guest token) can read a conversation.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const conversationId = params.get("conversationId") ?? "";
  const guestToken = params.get("guestToken");
  const since = params.get("since");
  if (!UUID_RE.test(conversationId)) {
    return NextResponse.json({ ok: false, error: "Chat not found." }, { status: 404 });
  }

  const viewer = await getViewer();
  const userId = viewer.isAuthenticated && viewer.user ? viewer.user.id : null;
  const conv = await findOwnedConversation(conversationId, {
    userId,
    guestToken: userId ? null : guestToken && UUID_RE.test(guestToken) ? guestToken : null,
  });
  if (!conv) return NextResponse.json({ ok: false, error: "Chat not found." }, { status: 404 });

  const messages = await listMessages(conv.id, since && !Number.isNaN(Date.parse(since)) ? since : null);
  return NextResponse.json({
    ok: true,
    data: {
      status: conv.status,
      consultantName: conv.assigned_name,
      messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })),
    },
  });
}
