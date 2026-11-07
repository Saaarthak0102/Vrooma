import React from "react";
import { requireRole } from "@/server/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { listBookings } from "@/server/repositories/bookings";
import { listWorkshops } from "@/server/repositories/showrooms";
import { StaffBookingsClient, type BayLoadRow } from "./StaffBookingsClient";

export const dynamic = "force-dynamic";

const IST = "Asia/Kolkata";

/** Screen 2 for every staff role: test drives and service bookings, plus workshop bay load for the next 7 days. */
export default async function StaffBookingsPage() {
  await requireRole("consultant", "manager", "admin");

  const now = new Date();
  const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const admin = createAdminClient();
  const [bookings, workshops, slotsRes] = await Promise.all([
    listBookings(),
    listWorkshops(),
    admin
      .from("slots")
      .select("workshop_id, starts_at, capacity, booked_count")
      .eq("kind", "service")
      .eq("is_active", true)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", until.toISOString())
      .limit(1000),
  ]);

  const workshopName = new Map(workshops.map((w) => [w.id, w.name]));
  const byKey = new Map<string, BayLoadRow>();
  for (const s of slotsRes.data ?? []) {
    if (!s.workshop_id) continue;
    const day = new Date(s.starts_at).toLocaleDateString("en-CA", { timeZone: IST }); // YYYY-MM-DD
    const key = `${s.workshop_id}|${day}`;
    const row =
      byKey.get(key) ??
      ({
        key,
        workshop: workshopName.get(s.workshop_id) ?? "Workshop",
        day,
        capacity: 0,
        booked: 0,
      } satisfies BayLoadRow);
    row.capacity += s.capacity;
    row.booked += s.booked_count;
    byKey.set(key, row);
  }

  const bayLoad = [...byKey.values()].sort((a, b) => a.day.localeCompare(b.day) || a.workshop.localeCompare(b.workshop));

  return <StaffBookingsClient
      bookings={bookings}
      bayLoad={bayLoad}
      workshops={workshops.map((w) => ({ id: w.id, name: w.name }))}
    />;
}
