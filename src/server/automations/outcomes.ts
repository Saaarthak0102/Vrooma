import { formatIstDateTime } from "@/lib/ist-format";
import { alertEmail } from "@/server/automations/alerts";
import type { OutboxRow } from "@/server/automations/types";

/**
 * T4: a booking whose slot ended over an hour ago is still "confirmed", so nobody recorded whether the buyer came.
 * The owner (the lead's consultant, else the shared alert mailbox) gets one email asking them to mark the outcome
 * in Staff > Bookings. Nothing is changed automatically: a person decides attended / no-show.
 */

export interface UnmarkedBooking {
  id: string;
  ref: string | null;
  kind: "test_drive" | "service";
  endedAt: string;
  buyer: string | null;
  place: string;
  ownerEmail: string | null;
  leadId: string | null;
}

export function planOutcomeReminders(bookings: UnmarkedBooking[], env?: Record<string, string | undefined>): OutboxRow[] {
  const rows: OutboxRow[] = [];
  for (const b of bookings) {
    const to = b.ownerEmail || alertEmail(env) || "manager@vrooma.in";
    const what = b.kind === "test_drive" ? "test drive" : "service";
    rows.push({
      channel: "email",
      to_address: to,
      template: "booking_outcome_needed",
      body:
        `Booking ${b.ref ?? b.id.slice(0, 8)} (${what}${b.buyer ? ` for ${b.buyer}` : ""}) at ${b.place} ended ${formatIstDateTime(b.endedAt)} ` +
        `and is still marked confirmed. Please open Staff > Bookings and record whether they attended or did not show, ` +
        `so the pipeline and no-show follow-up stay accurate.`,
      idempotency_key: `outcome:${b.id}`,
      booking_id: b.id,
      lead_id: b.leadId,
    });
  }
  return rows;
}

export async function selectUnmarkedBookings(admin: any, now: Date): Promise<UnmarkedBooking[]> {
  const endedBefore = new Date(now.getTime() - 60 * 60_000).toISOString();
  const endedAfter = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
  const { data, error } = await admin
    .from("bookings")
    .select(
      "id, ref, kind, lead_id, user:user_id ( full_name ), lead:lead_id ( assigned:assigned_to ( email ) ), slots:slot_id!inner ( ends_at, showroom:showroom_id ( name ), workshop:workshop_id ( name ) )",
    )
    .eq("status", "confirmed")
    .lt("slots.ends_at", endedBefore)
    .gt("slots.ends_at", endedAfter)
    .limit(200);
  if (error) throw new Error(`outcome query failed: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    ref: row.ref ?? null,
    kind: row.kind,
    endedAt: row.slots.ends_at,
    buyer: row.user?.full_name ?? null,
    place: row.slots.showroom?.name ?? row.slots.workshop?.name ?? "Vrooma",
    ownerEmail: row.lead?.assigned?.email ?? null,
    leadId: row.lead_id ?? null,
  }));
}
