import { NextRequest, NextResponse } from "next/server";
import { listSlots } from "@/server/repositories/slots";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = (searchParams.get("kind") as any) || undefined;
    const showroomId = searchParams.get("showroomId") || undefined;
    const workshopId = searchParams.get("workshopId") || undefined;
    const demoCarId = searchParams.get("demoCarId") || undefined;
    const date = searchParams.get("date") || undefined;

    const slots = await listSlots({ kind, showroomId, workshopId, demoCarId, date });
    return NextResponse.json({ ok: true, data: slots });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

