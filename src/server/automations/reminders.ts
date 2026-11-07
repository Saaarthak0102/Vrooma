import { formatIstDateTime } from "@/lib/ist-format";
import type { OutboxRow } from "@/server/automations/types";

/**
 * T1 / T2: test drive and service reminders.
 *
 *  - rem24: sent once the slot is within 24 h (but more than 3 h away).
 *  - rem2:  sent once the slot is within 3 h.
 * A reminder is skipped when the booking was made after that window opened (a booking made 5 h ahead gets only
 * the 3 h reminder; one made 2 h ahead gets none, since the confirmation was just sent). Transactional messages
 * about a booking the buyer made, so no marketing consent is involved.
 */

export interface ReminderBooking {
  id: string;
  ref: string | null;
  created_at: string;
  kind: "test_drive" | "service";
  status: string;
  car: string | null;
  startsAt: string;
  place: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  leadId: string | null;
}

const H = 3600_000;
export const REMINDER_WINDOWS = [
  { key: "rem24", fromMs: 3 * H, toMs: 24 * H },
  { key: "rem2", fromMs: 0, toMs: 3 * H },
] as const;

const REAL_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function planReminders(bookings: ReminderBooking[], now: Date): OutboxRow[] {
  const rows: OutboxRow[] = [];
  for (const b of bookings) {
    if (b.status !== "confirmed") continue;
    const start = new Date(b.startsAt).getTime();
    const untilStart = start - now.getTime();
    const window = REMINDER_WINDOWS.find((w) => untilStart > w.fromMs && untilStart <= w.toMs);
    if (!window) continue;
    if (new Date(b.created_at).getTime() > start - window.toMs) continue;

    const first = (b.name ?? "").trim().split(/\s+/)[0] || "there";
    const what = b.kind === "test_drive" ? "test drive" : "service appointment";
    const car = b.car ? ` for your ${b.car}` : "";
    const body =
      `Hi ${first}, a reminder from Vrooma: your ${what}${car} is on ${formatIstDateTime(b.startsAt)} at ${b.place}.` +
      `${b.ref ? ` Booking ${b.ref}.` : ""} Need to change it? Open your Vrooma dashboard or call the ${b.kind === "test_drive" ? "showroom" : "workshop"}.`;
    const template = b.kind === "test_drive" ? "test_drive_reminder" : "service_reminder";

    if (b.email && REAL_EMAIL.test(b.email)) {
      rows.push({ channel: "email", to_address: b.email, template, body, idempotency_key: `${window.key}:${b.id}:email`, booking_id: b.id, lead_id: b.leadId });
    }
    if (b.whatsapp) {
      rows.push({ channel: "whatsapp", to_address: b.whatsapp, template, body, idempotency_key: `${window.key}:${b.id}:wa`, booking_id: b.id, lead_id: b.leadId });
    }
  }
  return rows;
}

/** Loads confirmed bookings starting in the next 24 hours. */
export async function selectReminderBookings(admin: any, now: Date): Promise<ReminderBooking[]> {
  const until = new Date(now.getTime() + 24 * H).toISOString();
  const { data, error } = await admin
    .from("bookings")
    .select(
      "id, ref, created_at, kind, status, vehicle_info, lead_id, user:user_id ( full_name, email, phone, whatsapp ), slots:slot_id!inner ( starts_at, showroom:showroom_id ( name ), workshop:workshop_id ( name ) )",
    )
    .eq("status", "confirmed")
    .gt("slots.starts_at", now.toISOString())
    .lte("slots.starts_at", until)
    .limit(500);
  if (error) throw new Error(`reminder query failed: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    ref: row.ref ?? null,
    created_at: row.created_at,
    kind: row.kind,
    status: row.status,
    car: row.vehicle_info?.model_name ?? null,
    startsAt: row.slots.starts_at,
    place: row.slots.showroom?.name ?? row.slots.workshop?.name ?? "Vrooma",
    name: row.user?.full_name ?? null,
    email: row.user?.email ?? null,
    whatsapp: row.user?.whatsapp || row.user?.phone || null,
    leadId: row.lead_id ?? null,
  }));
}
