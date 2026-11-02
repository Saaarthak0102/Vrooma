import { NextRequest, NextResponse } from "next/server";
import { tradeInSchema } from "@/lib/validation/trade-in";
import { createTradeInRequest } from "@/server/repositories/trade-in";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = tradeInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const item = await createTradeInRequest(parsed.data);
    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
