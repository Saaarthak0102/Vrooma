import { NextRequest, NextResponse } from "next/server";
import { dispatchMessage } from "@/server/services/outbox";
import { guardCronOrAdmin } from "@/server/auth/api-guard";
import { z } from "zod";

const sendSchema = z.object({
  channel: z.enum(["whatsapp", "sms", "email"]),
  to: z.string().min(3).max(254),
  template: z.string().min(1).max(80),
  body: z.string().min(1).max(2000),
  leadId: z.string().uuid().optional(),
});

/** Machine or admin only: this queues an outbound message to an arbitrary address. */
export async function POST(request: NextRequest) {
  const denied = await guardCronOrAdmin(request);
  if (denied) return denied;

  try {
    const parsed = sendSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid message payload" }, { status: 400 });
    }
    const msg = await dispatchMessage(parsed.data);
    return NextResponse.json({ ok: true, data: msg });
  } catch (err: any) {
    console.error("[api/outbox/send] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
