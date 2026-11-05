import { NextRequest, NextResponse } from "next/server";
import { getTradeInUploadUrlsAction } from "@/server/actions/trade-in";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await getTradeInUploadUrlsAction(body?.files || []);

    if (!result.ok) {
      const status = result.error.code === "VALIDATION_FAILED" ? 400 : 500;
      return NextResponse.json({ ok: false, error: result.error.message }, { status });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to generate upload URLs" }, { status: 500 });
  }
}

