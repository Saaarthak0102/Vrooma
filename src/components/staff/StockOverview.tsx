"use client";

import React, { useMemo } from "react";
import { BarsChart, ChartCard, DonutChart, OverviewSection } from "@/components/charts/Charts";
import { bandCounts, countBy } from "@/lib/analytics";
import type { StockRow, TradeInRow } from "@/server/repositories/stock";

export type StockFilter = { kind: "status" | "fuel" | "price" | "age" | "unscored"; key: string; label: string } | null;
export type TradeInFilter = { kind: "condition" | "stage"; key: string; label: string } | null;

const LAKH = 100_000;
export const PRICE_BANDS = [
  { key: "p5", label: "< 5L", max: 5 * LAKH },
  { key: "p8", label: "5-8L", max: 8 * LAKH },
  { key: "p12", label: "8-12L", max: 12 * LAKH },
  { key: "p16", label: "12-16L", max: 16 * LAKH },
  { key: "p16plus", label: "16L+", max: Infinity },
];
export const AGE_BANDS = [
  { key: "a15", label: "0-15 d", max: 15 },
  { key: "a30", label: "16-30 d", max: 30 },
  { key: "a60", label: "31-60 d", max: 60 },
  { key: "a60plus", label: "60+ d", max: Infinity },
];

const STATUS_LABEL: Record<string, string> = { available: "Available", booked: "Booked", sold: "Sold" };
const STATUS_COLOR: Record<string, string> = { available: "var(--ok)", booked: "var(--warn)", sold: "#64748B" };

const ageDays = (c: StockRow, now: number) => (c.listed_at ? Math.max(0, Math.floor((now - new Date(c.listed_at).getTime()) / 86_400_000)) : 0);
const bandKey = (value: number, bands: Array<{ key: string; max: number }>) => (bands.find((b) => value <= b.max) ?? bands[bands.length - 1]).key;

export function stockMatches(c: StockRow, f: StockFilter, now: number): boolean {
  if (!f) return true;
  switch (f.kind) {
    case "status":
      return c.status === f.key;
    case "fuel":
      return c.fuel === f.key;
    case "price":
      return bandKey(c.price, PRICE_BANDS) === f.key;
    case "age":
      return c.status !== "sold" && bandKey(ageDays(c, now), AGE_BANDS) === f.key;
    case "unscored":
      return c.status !== "sold" && c.inspection_score === null;
  }
}

export function tradeInMatches(t: TradeInRow, f: TradeInFilter): boolean {
  if (!f) return true;
  return f.kind === "condition" ? t.condition === f.key : (t.lead_status ?? "none") === f.key;
}

const cap = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function StockOverview({
  tab,
  stock,
  tradeIns,
  stockFilter,
  onStockFilter,
  tradeInFilter,
  onTradeInFilter,
}: {
  tab: "stock" | "tradeins";
  stock: StockRow[];
  tradeIns: TradeInRow[];
  stockFilter: StockFilter;
  onStockFilter: (f: StockFilter) => void;
  tradeInFilter: TradeInFilter;
  onTradeInFilter: (f: TradeInFilter) => void;
}) {
  // Same instant for every chart in this render, and not read during SSR-only code paths.
  const now = useMemo(() => Date.now(), []);
  const inStock = useMemo(() => stock.filter((c) => c.status !== "sold"), [stock]);

  const byStatus = useMemo(() => countBy(stock, (c) => c.status, { labelOf: (k) => STATUS_LABEL[k] ?? k }), [stock]);
  const byFuel = useMemo(() => countBy(inStock, (c) => c.fuel, { labelOf: cap }), [inStock]);
  const prices = useMemo(() => bandCounts(inStock.map((c) => c.price), PRICE_BANDS), [inStock]);
  const ages = useMemo(() => bandCounts(inStock.map((c) => ageDays(c, now)), AGE_BANDS), [inStock, now]);

  const byCondition = useMemo(() => countBy(tradeIns, (t) => t.condition, { labelOf: cap }), [tradeIns]);
  const byStage = useMemo(() => countBy(tradeIns, (t) => t.lead_status ?? "none", { labelOf: (k) => (k === "none" ? "No lead" : cap(k)) }), [tradeIns]);

  const mineS = (kind: string) => (stockFilter?.kind === kind ? stockFilter : null);
  const mineT = (kind: string) => (tradeInFilter?.kind === kind ? tradeInFilter : null);

  if (tab === "tradeins") {
    return (
      <OverviewSection id="trade-ins">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ChartCard
            title="Reported condition"
            subtitle="Tap a slice to filter"
            empty={tradeIns.length === 0}
            filterLabel={mineT("condition")?.label}
            onClear={() => onTradeInFilter(null)}
          >
            <DonutChart
              data={byCondition}
              centerLabel="requests"
              selected={mineT("condition")?.key}
              onSelect={(key) => onTradeInFilter(key ? { kind: "condition", key, label: cap(key) } : null)}
            />
          </ChartCard>
          <ChartCard
            title="Lead stage"
            subtitle="Where each trade-in enquiry stands"
            empty={tradeIns.length === 0}
            filterLabel={mineT("stage")?.label}
            onClear={() => onTradeInFilter(null)}
          >
            <BarsChart
              horizontal
              data={byStage.map((s) => ({ key: s.key, label: s.label, value: s.value }))}
              selected={mineT("stage")?.key}
              onSelect={(key) => onTradeInFilter(key ? { kind: "stage", key, label: key === "none" ? "No lead" : cap(key) } : null)}
            />
          </ChartCard>
        </div>
      </OverviewSection>
    );
  }

  return (
    <OverviewSection id="used-stock">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard
          title="Stock status"
          subtitle="All vehicles"
          empty={stock.length === 0}
          filterLabel={mineS("status")?.label}
          onClear={() => onStockFilter(null)}
        >
          <DonutChart
            data={byStatus}
            centerLabel="vehicles"
            colorOf={(k) => STATUS_COLOR[k] ?? "#64748B"}
            selected={mineS("status")?.key}
            onSelect={(key) => onStockFilter(key ? { kind: "status", key, label: STATUS_LABEL[key] ?? key } : null)}
          />
        </ChartCard>

        <ChartCard
          title="Price bands"
          subtitle="Unsold stock"
          empty={inStock.length === 0}
          filterLabel={mineS("price")?.label}
          onClear={() => onStockFilter(null)}
        >
          <BarsChart
            data={prices}
            selected={mineS("price")?.key}
            onSelect={(key) => onStockFilter(key ? { kind: "price", key, label: prices.find((p) => p.key === key)?.label ?? key } : null)}
          />
        </ChartCard>

        <ChartCard
          title="Days on lot"
          subtitle="Older stock needs a price look"
          empty={inStock.length === 0}
          filterLabel={mineS("age")?.label}
          onClear={() => onStockFilter(null)}
        >
          <BarsChart
            data={ages}
            colorOf={(row) => (row.key === "a60plus" ? "var(--danger)" : row.key === "a60" ? "var(--warn)" : "var(--accent)")}
            selected={mineS("age")?.key}
            onSelect={(key) => onStockFilter(key ? { kind: "age", key, label: ages.find((p) => p.key === key)?.label ?? key } : null)}
          />
        </ChartCard>

        <ChartCard
          title="Fuel mix"
          subtitle="Unsold stock"
          empty={byFuel.length === 0}
          filterLabel={mineS("fuel")?.label}
          onClear={() => onStockFilter(null)}
        >
          <DonutChart
            data={byFuel}
            centerLabel="vehicles"
            selected={mineS("fuel")?.key}
            onSelect={(key) => onStockFilter(key ? { kind: "fuel", key, label: cap(key) } : null)}
          />
        </ChartCard>
      </div>
    </OverviewSection>
  );
}
