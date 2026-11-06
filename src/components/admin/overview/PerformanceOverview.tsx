"use client";

import React, { useMemo, useState } from "react";
import { BarsChart, ChartCard, FunnelBars, OverviewSection, TrendChart } from "@/components/charts/Charts";
import { bucketByDay, funnelFromStatuses } from "@/lib/analytics";
import type { OverviewBooking, OverviewLead } from "@/server/repositories/admin-overview";

const FUNNEL = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "test_drive_booked", label: "Test drive" },
  { key: "negotiating", label: "Negotiating" },
  { key: "won", label: "Won" },
];

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/**
 * Dealer Principal charts: the lead funnel, daily enquiries against how many got a reply inside the SLA,
 * booking volume, and who is carrying how many leads. Everything is computed from rows read on the server.
 */
export function PerformanceOverview({ leads, bookings }: { leads: OverviewLead[]; bookings: OverviewBooking[] }) {
  const [range, setRange] = useState(30);
  const since = useMemo(() => Date.now() - range * 86_400_000, [range]);

  const inRange = useMemo(() => leads.filter((l) => new Date(l.created_at).getTime() >= since), [leads, since]);
  const bookingsInRange = useMemo(() => bookings.filter((b) => new Date(b.created_at).getTime() >= since), [bookings, since]);

  const funnel = useMemo(() => funnelFromStatuses(inRange.map((l) => l.status), FUNNEL), [inRange]);
  const lost = inRange.filter((l) => l.status === "lost").length;

  const leadTrend = useMemo(() => {
    const received = bucketByDay(inRange, (l) => l.created_at, range);
    const answered = bucketByDay(
      inRange.filter((l) => l.first_contacted_at && new Date(l.first_contacted_at) <= new Date(l.sla_due_at)),
      (l) => l.created_at,
      range
    );
    return received.map((d, i) => ({ label: dayLabel(d.day), received: d.total, answered: answered[i].total }));
  }, [inRange, range]);

  const bookingTrend = useMemo(() => {
    const rows = bucketByDay(bookingsInRange, (b) => b.created_at, range, Date.now(), (b) => b.kind);
    return rows.map((d) => ({ label: dayLabel(d.day), test_drive: Number(d.test_drive ?? 0), service: Number(d.service ?? 0) }));
  }, [bookingsInRange, range]);

  const team = useMemo(() => {
    const by = new Map<string, { label: string; won: number; open: number; fresh: number; lost: number }>();
    for (const l of inRange) {
      const row = by.get(l.consultant) ?? { label: l.consultant, won: 0, open: 0, fresh: 0, lost: 0 };
      if (l.status === "won") row.won += 1;
      else if (l.status === "lost") row.lost += 1;
      else if (l.status === "new") row.fresh += 1;
      else row.open += 1;
      by.set(l.consultant, row);
    }
    return [...by.values()].sort((a, b) => b.won + b.open + b.fresh + b.lost - (a.won + a.open + a.fresh + a.lost));
  }, [inRange]);

  return (
    <OverviewSection id="admin-performance" range={range} onRangeChange={setRange}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard
          title="Lead funnel"
          subtitle={`Reached each stage · ${lost} lost`}
          empty={inRange.length === 0}
        >
          <FunnelBars stages={funnel} />
        </ChartCard>

        <ChartCard title="Enquiries vs replied in time" subtitle={`Last ${range} days`} empty={inRange.length === 0} className="xl:col-span-2">
          <TrendChart
            data={leadTrend}
            series={[
              { key: "received", label: "Received", color: "#3B82F6" },
              { key: "answered", label: "Replied inside 5 min", color: "var(--accent)" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Online bookings" subtitle="Test drives and service" empty={bookingsInRange.length === 0}>
          <TrendChart
            data={bookingTrend}
            series={[
              { key: "test_drive", label: "Test drives", color: "var(--accent)" },
              { key: "service", label: "Service", color: "#3B82F6" },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Team workload"
          subtitle="Leads per consultant by stage"
          empty={team.length === 0}
          className="md:col-span-2 xl:col-span-4"
          height={Math.max(200, team.length * 34 + 60)}
        >
          <BarsChart
            horizontal
            data={team}
            series={[
              { key: "fresh", label: "Awaiting reply", color: "var(--warn)" },
              { key: "open", label: "In progress", color: "#3B82F6" },
              { key: "won", label: "Won", color: "var(--ok)" },
              { key: "lost", label: "Lost", color: "var(--danger)" },
            ]}
          />
        </ChartCard>
      </div>
    </OverviewSection>
  );
}
