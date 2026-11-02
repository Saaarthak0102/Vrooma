import { NextRequest, NextResponse } from "next/server";
import { dispatchMessage } from "@/server/services/outbox";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const msg = await dispatchMessage(body);
    return NextResponse.json({ ok: true, data: msg });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

