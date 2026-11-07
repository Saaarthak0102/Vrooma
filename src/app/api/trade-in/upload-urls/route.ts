import { NextRequest, NextResponse } from "next/server";
import { getTradeInUploadUrlsAction } from "@/server/actions/trade-in";
import { guardOrigin } from "@/server/auth/api-guard";
import { getTrustedClientIp } from "@/lib/network";
import { rateLimit } from "@/server/security/rate-limit";

/** Anonymous endpoint (the trade-in form is open to guests), so it is origin-checked and rate limited. */
export async function POST(request: NextRequest) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;

  try {
    const ip = getTrustedClientIp(request);
    if (!(await rateLimit(`tradein_upload_${ip}`, 10, 60))) {
      return NextResponse.json({ ok: false, error: "Too many uploads. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json();
    const result = await getTradeInUploadUrlsAction(body?.files || []);

    if (!result.ok) {
      const status = result.error.code === "VALIDATION_FAILED" ? 400 : 500;
      return NextResponse.json({ ok: false, error: result.error.message }, { status });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("[api/trade-in/upload-urls] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Could not prepare the upload. Please try again." }, { status: 500 });
  }
}
