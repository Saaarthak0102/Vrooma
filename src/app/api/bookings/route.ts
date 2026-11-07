import { NextResponse } from "next/server";
import { listBookings } from "@/server/repositories/bookings";
import { guardUser } from "@/server/auth/api-guard";

/** Returns ONLY the signed-in user's bookings. A client-supplied userId is never read. */
export async function GET() {
  const session = await guardUser();
  if (!session.ok) return session.response;

  try {
    const bookings = await listBookings(session.user.id);
    return NextResponse.json({ ok: true, data: bookings });
  } catch (err: any) {
    console.error("[api/bookings] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** Bookings are created by bookSlotAction (atomic book_slot RPC with the user's session). */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "This endpoint is retired. Use the booking wizard (bookSlotAction)." },
    { status: 410 }
  );
}
