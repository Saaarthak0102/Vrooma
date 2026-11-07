import { NextRequest, NextResponse } from "next/server";
import { listSlots } from "@/server/repositories/slots";
import { listShowrooms } from "@/server/repositories/showrooms";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isNext = searchParams.get("next") === "1";

    if (isNext) {
      const [slots, showrooms] = await Promise.all([
        listSlots({ kind: "test_drive" }),
        listShowrooms(),
      ]);

      const now = new Date();
      const available = slots
        .filter((s) => s.booked_count < s.capacity && new Date(s.starts_at) > now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

      if (available.length === 0) {
        return NextResponse.json({ ok: true, data: null });
      }

      const earliest = available[0];
      const showroom = showrooms.find((sr) => sr.id === earliest.showroom_id);
      const dateObj = new Date(earliest.starts_at);
      const timeFormatted = dateObj.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const dayFormatted = dateObj.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      return NextResponse.json({
        ok: true,
        data: {
          slotId: earliest.id,
          timeFormatted: `${dayFormatted}, ${timeFormatted}`,
          startsAt: earliest.starts_at,
          showroomName: showroom?.name ?? "Lucknow Flagship",
        },
      });
    }

    const kind = (searchParams.get("kind") as any) || undefined;
    const showroomId = searchParams.get("showroomId") || undefined;
    const workshopId = searchParams.get("workshopId") || undefined;
    const demoCarId = searchParams.get("demoCarId") || undefined;
    const date = searchParams.get("date") || undefined;

    const slots = await listSlots({ kind, showroomId, workshopId, demoCarId, date });
    const response = NextResponse.json({ ok: true, data: slots });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );
    return response;
  } catch (err: any) {
    console.error("[api/slots] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
