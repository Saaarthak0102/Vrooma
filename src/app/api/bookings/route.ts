import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation/booking";
import { createBooking, listBookings } from "@/server/repositories/bookings";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const bookings = await listBookings(userId);
    return NextResponse.json({ ok: true, data: bookings });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      user_id: "usr-buyer-1",
      slot_id: parsed.data.slot_id,
      kind: parsed.data.kind,
      status: "confirmed",
      vehicle_info: parsed.data.vehicle_info,
      showroom_or_workshop_name: "Vrooma Lucknow Facility",
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      notes: parsed.data.notes,
    });

    return NextResponse.json({ ok: true, data: booking }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
