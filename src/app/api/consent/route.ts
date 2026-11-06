import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordConsent } from "@/server/privacy/consent";
import { guardUser } from "@/server/auth/api-guard";
import { getTrustedClientIp } from "@/lib/network";

const bodySchema = z.object({
  purpose: z.enum(["marketing", "newsletter", "service_contact", "lead_contact"]),
  granted: z.boolean(),
});

/**
 * Appends an immutable DPDP consent row (public.consents) for the SIGNED-IN user.
 * It used to log to the console and answer {logged: true} without storing anything.
 * Terms/privacy consent is captured at onboarding, not here.
 */
export async function POST(request: NextRequest) {
  const session = await guardUser();
  if (!session.ok) return session.response;

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid consent payload" }, { status: 400 });
    }

    const id = await recordConsent({
      userId: session.user.id,
      email: session.user.email,
      purpose: parsed.data.purpose,
      granted: parsed.data.granted,
      source: "profile",
      ipAddress: getTrustedClientIp(request),
    });
    return NextResponse.json({ ok: true, data: { consentId: id, recordedAt: new Date().toISOString() } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
