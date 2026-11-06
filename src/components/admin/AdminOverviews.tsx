"use client";

import React, { useMemo } from "react";
import { BarsChart, ChartCard, DonutChart, OverviewSection } from "@/components/charts/Charts";
import { countBy, istDay } from "@/lib/analytics";
import { ROLE_LABEL } from "@/lib/console-nav";
import type { Role } from "@/types/domain";

const kv = (rows: Array<{ key: string; label: string; value: number }>) => rows.map((r) => ({ ...r }));

/** Catalog > Models: buyer demand per model next to how much of the catalog is live. */
export function CatalogOverview({
  demand,
  models,
}: {
  demand: Array<{ model: string; count: number }>;
  models: Array<{ is_active: boolean; variants: Array<{ is_active: boolean }> }>;
}) {
  const bars = demand.slice(0, 8).map((d) => ({ key: d.model, label: d.model, value: d.count }));
  const live = models.filter((m) => m.is_active).length;
  const variantsLive = models.flatMap((m) => m.variants).filter((v) => v.is_active).length;
  const variantsOff = models.flatMap((m) => m.variants).length - variantsLive;
  const catalog = [
    { key: "live", label: "Live models", value: live },
    { key: "hidden", label: "Hidden models", value: models.length - live },
    { key: "variants", label: "Live variants", value: variantsLive },
    { key: "variants_off", label: "Hidden variants", value: variantsOff },
  ].filter((r) => r.value > 0);

  return (
    <OverviewSection id="admin-catalog">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChartCard title="Enquiries by model" subtitle="Last 90 days · what buyers ask about" empty={bars.length === 0}>
          <BarsChart horizontal data={bars} />
        </ChartCard>
        <ChartCard title="Catalog on the website" subtitle="Live vs hidden" empty={catalog.length === 0}>
          <DonutChart data={kv(catalog)} centerLabel="items" />
        </ChartCard>
      </div>
    </OverviewSection>
  );
}

/** Team > People: roles and who is active. */
export function PeopleOverview({ users }: { users: Array<{ role: Role; is_active?: boolean }> }) {
  const byRole = useMemo(() => countBy(users, (u) => u.role, { labelOf: (r) => ROLE_LABEL[r as Role] ?? r }), [users]);
  const active = users.filter((u) => u.is_active !== false).length;
  const state = [
    { key: "active", label: "Active", value: active },
    { key: "off", label: "Deactivated", value: users.length - active },
  ].filter((r) => r.value > 0);

  return (
    <OverviewSection id="admin-people">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChartCard title="People by role" empty={users.length === 0}>
          <DonutChart data={byRole} centerLabel="people" />
        </ChartCard>
        <ChartCard title="Account status" subtitle="Deactivated people cannot sign in" empty={users.length === 0}>
          <DonutChart data={state} centerLabel="accounts" colorOf={(k) => (k === "active" ? "var(--ok)" : "#64748B")} />
        </ChartCard>
      </div>
    </OverviewSection>
  );
}

/** Team > Lead routing: open leads per consultant, i.e. the load the "least loaded" rule balances. */
export function RoutingOverview({ load }: { load: Array<{ consultant: string; count: number }> }) {
  const bars = load.map((l) => ({ key: l.consultant, label: l.consultant, value: l.count }));
  return (
    <OverviewSection id="admin-routing">
      <ChartCard
        title="Open leads per consultant"
        subtitle="New leads go to the least loaded available person"
        empty={bars.length === 0}
        height={Math.max(160, bars.length * 34 + 50)}
      >
        <BarsChart horizontal data={bars} />
      </ChartCard>
    </OverviewSection>
  );
}

/** Team > Slot calendar: bookable capacity against bookings, per day. */
export function SlotsOverview({ slots }: { slots: Array<{ starts_at: string; capacity: number; booked: number; kind: string }> }) {
  const data = useMemo(() => {
    const by = new Map<string, { booked: number; free: number }>();
    const today = istDay(Date.now());
    for (const s of slots) {
      const day = istDay(s.starts_at);
      if (day < today) continue;
      const cur = by.get(day) ?? { booked: 0, free: 0 };
      cur.booked += s.booked;
      cur.free += Math.max(0, s.capacity - s.booked);
      by.set(day, cur);
    }
    return [...by.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 14)
      .map(([day, v]) => ({
        label: new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
        ...v,
      }));
  }, [slots]);

  return (
    <OverviewSection id="admin-slots">
      <ChartCard title="Capacity by day" subtitle="Upcoming days in the slot list below · booked vs free" empty={data.length === 0}>
        <BarsChart
          data={data}
          series={[
            { key: "booked", label: "Booked", color: "var(--warn)" },
            { key: "free", label: "Free", color: "var(--ok)" },
          ]}
        />
      </ChartCard>
    </OverviewSection>
  );
}
