import { NextRequest, NextResponse } from "next/server";
import { submitTradeInAction } from "@/server/actions/trade-in";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await submitTradeInAction(body);

    if (!result.ok) {
      const status = result.error.code === "VALIDATION_FAILED" ? 400 : 500;
      return NextResponse.json({ ok: false, error: result.error.message }, { status });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to process trade-in request" }, { status: 500 });
  }
}
