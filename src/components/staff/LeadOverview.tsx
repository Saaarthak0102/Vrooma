"use client";

import React, { useMemo } from "react";
import { BarsChart, ChartCard, DonutChart, FunnelBars, OverviewSection, TrendChart } from "@/components/charts/Charts";
import { bucketByDay, countBy, funnelFromStatuses } from "@/lib/analytics";
import type { Lead } from "@/types/domain";

export type LeadFilter =
  | { kind: "kpi"; key: "new" | "overdue" | "active" | "won"; label: string }
  | { kind: "stage" | "source" | "model"; key: string; label: string }
  | null;

const FUNNEL = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "test_drive_booked", label: "Test drive" },
  { key: "negotiating", label: "Negotiating" },
  { key: "won", label: "Won" },
];
const RANK = new Map(FUNNEL.map((s, i) => [s.key, i]));

const sourceLabel = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const modelOf = (l: Lead) => l.model_name || "General enquiry";

/** The single rule that decides which rows a chip/KPI leaves in the table. Shared so counts always agree. */
export function leadMatches(l: Lead, f: LeadFilter, now: number | null): boolean {
  if (!f) return true;
  switch (f.kind) {
    case "kpi":
      if (f.key === "new") return l.status === "new";
      if (f.key === "overdue") return l.status === "new" && now !== null && new Date(l.sla_due_at).getTime() < now;
      if (f.key === "active") return ["contacted", "test_drive_booked", "negotiating"].includes(l.status);
      return l.status === "won";
    case "stage": {
      // Funnel bars are cumulative ("reached this stage or later"), so the table shows the same set.
      const need = RANK.get(f.key);
      const have = RANK.get(l.status);
      return need !== undefined && have !== undefined && have >= need;
    }
    case "source":
      return l.source === f.key;
    case "model":
      return f.key === "__other" ? false : modelOf(l) === f.key;
  }
}

export function LeadOverview({
  leads,
  filter,
  onFilter,
}: {
  leads: Lead[];
  filter: LeadFilter;
  onFilter: (f: LeadFilter) => void;
}) {
  const funnel = useMemo(() => funnelFromStatuses(leads.map((l) => l.status), FUNNEL), [leads]);
  const bySource = useMemo(() => countBy(leads, (l) => l.source, { labelOf: sourceLabel }), [leads]);
  const byModel = useMemo(
    () => countBy(leads, modelOf, { limit: 6 }).map((s) => ({ key: s.key, label: s.label, value: s.value })),
    [leads]
  );
  const trend = useMemo(
    () =>
      bucketByDay(leads, (l) => l.created_at, 14).map((d) => ({
        label: new Date(`${d.day}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
        leads: d.total,
      })),
    [leads]
  );

  const mine = (kind: string) => (filter?.kind === kind ? filter : null);

  return (
    <OverviewSection id="lead-desk">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard
          title="Pipeline"
          subtitle={leads.length >= 200 ? "Latest 200 leads · tap to filter" : "Reached each stage · tap to filter"}
          empty={leads.length === 0}
          filterLabel={mine("stage")?.label}
          onClear={() => onFilter(null)}
        >
          <FunnelBars
            stages={funnel}
            selected={mine("stage")?.key}
            onSelect={(key) => onFilter(key ? { kind: "stage", key, label: FUNNEL.find((s) => s.key === key)?.label ?? key } : null)}
          />
        </ChartCard>

        <ChartCard
          title="Lead source"
          subtitle="Where enquiries come from"
          empty={bySource.length === 0}
          filterLabel={mine("source")?.label}
          onClear={() => onFilter(null)}
        >
          <DonutChart
            data={bySource}
            centerLabel="leads"
            selected={mine("source")?.key}
            onSelect={(key) => onFilter(key ? { kind: "source", key, label: sourceLabel(key) } : null)}
          />
        </ChartCard>

        <ChartCard
          title="Interest by model"
          subtitle="Top models asked about"
          empty={byModel.length === 0}
          filterLabel={mine("model")?.label}
          onClear={() => onFilter(null)}
        >
          <BarsChart
            horizontal
            data={byModel}
            selected={mine("model")?.key}
            onSelect={(key) => onFilter(key && key !== "__other" ? { kind: "model", key, label: key } : null)}
          />
        </ChartCard>

        <ChartCard title="New leads per day" subtitle="Last 14 days" empty={leads.length === 0}>
          <TrendChart data={trend} series={[{ key: "leads", label: "Leads" }]} />
        </ChartCard>
      </div>
    </OverviewSection>
  );
}
