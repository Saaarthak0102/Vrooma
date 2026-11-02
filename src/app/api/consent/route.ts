import { NextRequest, NextResponse } from "next/server";
import { consentSchema } from "@/lib/validation/consent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = consentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid consent schema" }, { status: 400 });
    }

    // In mock mode, log consent update
    console.info(`[DPDP Consent Audit] Purpose: ${parsed.data.purpose} | Granted: ${parsed.data.granted}`);
    return NextResponse.json({ ok: true, data: { logged: true, timestamp: new Date().toISOString() } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
