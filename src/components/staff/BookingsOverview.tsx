"use client";

import React, { useMemo } from "react";
import { BarsChart, ChartCard, DonutChart, OverviewSection } from "@/components/charts/Charts";
import { bucketByDay, countBy, istDay, pct } from "@/lib/analytics";
import { StatCard } from "@/components/dashboard/StatCard";
import { CalendarCheck, CalendarClock, UserX } from "lucide-react";
import type { Booking } from "@/types/domain";

export type BookingFilter = { kind: "status" | "type"; key: string; label: string } | null;

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Upcoming / open",
  completed: "Attended",
  no_show: "No-show",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  confirmed: "#3B82F6",
  completed: "var(--ok)",
  no_show: "var(--danger)",
  cancelled: "#64748B",
};
const TYPE_LABEL: Record<string, string> = { test_drive: "Test drive", service: "Service" };

export function bookingMatches(b: Booking, f: BookingFilter): boolean {
  if (!f) return true;
  return f.kind === "status" ? b.status === f.key : b.kind === f.key;
}

export function BookingsOverview({
  bookings,
  bayLoad,
  filter,
  onFilter,
}: {
  bookings: Booking[];
  bayLoad: Array<{ day: string; capacity: number; booked: number }>;
  filter: BookingFilter;
  onFilter: (f: BookingFilter) => void;
}) {
  const today = istDay(Date.now());
  const live = useMemo(() => bookings.filter((b) => b.status !== "cancelled"), [bookings]);

  const kpi = useMemo(() => {
    const weekEnd = istDay(Date.now() + 6 * 86_400_000);
    const done = bookings.filter((b) => b.status === "completed").length;
    const missed = bookings.filter((b) => b.status === "no_show").length;
    return {
      today: live.filter((b) => b.status === "confirmed" && istDay(b.starts_at) === today).length,
      week: live.filter((b) => b.status === "confirmed" && istDay(b.starts_at) >= today && istDay(b.starts_at) <= weekEnd).length,
      noShow: pct(missed, done + missed),
      judged: done + missed,
    };
  }, [bookings, live, today]);

  const week = useMemo(
    () =>
      bucketByDay(
        live,
        (b) => b.starts_at,
        7,
        Date.now() + 6 * 86_400_000,
        (b) => b.kind
      ).map((d) => ({
        label: new Date(`${d.day}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", timeZone: "Asia/Kolkata" }),
        test_drive: Number(d.test_drive ?? 0),
        service: Number(d.service ?? 0),
      })),
    [live]
  );

  const bays = useMemo(() => {
    const byDay = new Map<string, { booked: number; capacity: number }>();
    for (const r of bayLoad) {
      const cur = byDay.get(r.day) ?? { booked: 0, capacity: 0 };
      cur.booked += r.booked;
      cur.capacity += r.capacity;
      byDay.set(r.day, cur);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({
        label: new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", timeZone: "Asia/Kolkata" }),
        booked: v.booked,
        free: Math.max(0, v.capacity - v.booked),
      }));
  }, [bayLoad]);

  const byStatus = useMemo(() => countBy(bookings, (b) => b.status, { labelOf: (k) => STATUS_LABEL[k] ?? k }), [bookings]);
  const byType = useMemo(() => countBy(bookings, (b) => b.kind, { labelOf: (k) => TYPE_LABEL[k] ?? k }), [bookings]);
  const mine = (kind: string) => (filter?.kind === kind ? filter : null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Today" value={kpi.today} subtitle="Confirmed, still to happen" icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Next 7 days" value={kpi.week} subtitle="Test drives and service" icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard
          label="No-show rate"
          value={kpi.judged ? `${kpi.noShow}%` : "–"}
          subtitle={kpi.judged ? `Of ${kpi.judged} marked attended or no-show` : "Nothing marked yet"}
          icon={<UserX className="h-4 w-4" />}
        />
      </div>

      <OverviewSection id="bookings">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ChartCard title="Bookings · next 7 days" subtitle="By day and type" empty={week.every((d) => d.test_drive + d.service === 0)}>
            <BarsChart
              data={week}
              series={[
                { key: "test_drive", label: "Test drive", color: "var(--accent)" },
                { key: "service", label: "Service", color: "#3B82F6" },
              ]}
            />
          </ChartCard>

          <ChartCard title="Workshop bay load" subtitle="Booked vs free, next 7 days" empty={bays.length === 0}>
            <BarsChart
              data={bays}
              series={[
                { key: "booked", label: "Booked", color: "var(--warn)" },
                { key: "free", label: "Free", color: "var(--ok)" },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Outcomes"
            subtitle="Tap a slice to filter"
            empty={bookings.length === 0}
            filterLabel={mine("status")?.label}
            onClear={() => onFilter(null)}
          >
            <DonutChart
              data={byStatus}
              centerLabel="bookings"
              colorOf={(k) => STATUS_COLOR[k] ?? "#64748B"}
              selected={mine("status")?.key}
              onSelect={(key) => onFilter(key ? { kind: "status", key, label: STATUS_LABEL[key] ?? key } : null)}
            />
          </ChartCard>

          <ChartCard
            title="Type"
            subtitle="Test drives vs service"
            empty={bookings.length === 0}
            filterLabel={mine("type")?.label}
            onClear={() => onFilter(null)}
          >
            <DonutChart
              data={byType}
              centerLabel="bookings"
              selected={mine("type")?.key}
              onSelect={(key) => onFilter(key ? { kind: "type", key, label: TYPE_LABEL[key] ?? key } : null)}
            />
          </ChartCard>
        </div>
      </OverviewSection>
    </div>
  );
}
