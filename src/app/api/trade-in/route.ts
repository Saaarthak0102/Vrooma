import { NextRequest, NextResponse } from "next/server";
import { submitTradeInAction } from "@/server/actions/trade-in";
import { guardOrigin } from "@/server/auth/api-guard";
import { getTrustedClientIp } from "@/lib/network";
import { rateLimit } from "@/server/security/rate-limit";

export async function POST(request: NextRequest) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;

  try {
    const ip = getTrustedClientIp(request);
    if (!(await rateLimit(`tradein_submit_${ip}`, 5, 60))) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json();
    const result = await submitTradeInAction(body);

    if (!result.ok) {
      const status = result.error.code === "VALIDATION_FAILED" ? 400 : 500;
      return NextResponse.json({ ok: false, error: result.error.message }, { status });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    console.error("[api/trade-in] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "We could not process your trade-in request. Please try again." }, { status: 500 });
  }
}
