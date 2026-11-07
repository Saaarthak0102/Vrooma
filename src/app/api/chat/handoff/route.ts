import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/server/auth/viewer";
import { findOwnedConversation } from "@/server/repositories/chats";
import { requestHandoff } from "@/server/services/chat-handoff";
import { normalizeIndianPhone } from "@/lib/phone";
import { getTrustedClientIp } from "@/lib/network";
import { rateLimit } from "@/server/security/rate-limit";
import { guardOrigin } from "@/server/auth/api-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  conversationId: z.string().uuid(),
  guestToken: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2, "Please enter your name").max(100),
  phone: z
    .string()
    .transform((v) => normalizeIndianPhone(v) || "")
    .refine((v) => v.length === 13, { message: "Please enter a valid 10-digit Indian mobile number" }),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required so a consultant can contact you." }) }),
});

/** Contact details from the chat's inline form (guests, or buyers without a saved mobile number). */
export async function POST(request: NextRequest) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const viewer = await getViewer();
    const ip = getTrustedClientIp(request);
    if (!(await rateLimit(`chat_handoff_${viewer.user?.id ?? `ip_${ip}`}`, 5, 60))) {
      return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a minute." }, { status: 429 });
    }

    const userId = viewer.isAuthenticated && viewer.user ? viewer.user.id : null;
    const conv = await findOwnedConversation(input.conversationId, { userId, guestToken: userId ? null : input.guestToken });
    if (!conv) return NextResponse.json({ ok: false, error: "Chat not found." }, { status: 404 });

    const res = await requestHandoff({
      conversationId: conv.id,
      contact: { name: input.name, phone: input.phone, email: input.email || viewer.user?.email || null },
      userId,
      ipAddress: ip,
    });
    if ("error" in res) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });

    return NextResponse.json({
      ok: true,
      data: {
        conversationId: conv.id,
        status: res.conversation.status,
        consultantName: res.consultantName,
        leadRef: res.leadRef,
      },
    });
  } catch (err: any) {
    console.error("[api/chat/handoff] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "We could not connect you right now. Please try again." }, { status: 500 });
  }
}
