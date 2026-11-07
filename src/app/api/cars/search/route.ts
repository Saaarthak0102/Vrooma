import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/server/repositories/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") || undefined;
    const bodyType = searchParams.get("body_type") || undefined;
    const fuel = searchParams.get("fuel") || undefined;

    const models = await listModels({ search, bodyType, fuel });
    return NextResponse.json({ ok: true, data: models });
  } catch (err: any) {
    console.error("[api/cars/search] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

