import { NextRequest, NextResponse } from "next/server";
import { processLeadCsv } from "@/server/services/csv-import";

export async function POST(request: NextRequest) {
  try {
    const { csv } = await request.json();
    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ ok: false, error: "CSV string required in body" }, { status: 400 });
    }

    const result = await processLeadCsv(csv);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
