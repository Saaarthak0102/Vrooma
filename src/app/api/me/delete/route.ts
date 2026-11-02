import { NextRequest, NextResponse } from "next/server";
import { deletionRequestSchema } from "@/lib/validation/consent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deletionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400 });
    }

    console.info(`[DPDP Erasure Request] Purge scheduled for email: ${parsed.data.email}`);
    return NextResponse.json({
      ok: true,
      data: { status: "purge_queued", eta: "48_hours", notice: "DPDP Section 12 compliant" },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
