"use client";

import React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { FunnelStage } from "@/lib/analytics";

/*
 * Recharts is heavy and only the consoles use it, so it loads on demand in the browser (no server render, no
 * hydration mismatch, nothing added to buyer pages).
 */
const Loading = () => <div className="h-full w-full animate-pulse rounded-lg bg-border/50" aria-hidden />;

export const DonutChart = dynamic(() => import("./Charts.impl").then((m) => m.DonutChart), { ssr: false, loading: Loading });
export const BarsChart = dynamic(() => import("./Charts.impl").then((m) => m.BarsChart), { ssr: false, loading: Loading });
export const TrendChart = dynamic(() => import("./Charts.impl").then((m) => m.TrendChart), { ssr: false, loading: Loading });

/** A titled chart tile with a fixed plot height, an optional active-filter chip and an empty state. */
export function ChartCard({
  title,
  subtitle,
  empty,
  filterLabel,
  onClear,
  height = 220,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  /** True when there is nothing to plot. */
  empty?: boolean;
  /** Shown as a removable chip when this chart is filtering the table. */
  filterLabel?: string | null;
  onClear?: () => void;
  height?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border border-border bg-surface p-4 shadow-card", className)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</h3>
          {subtitle && <p className="truncate text-[11px] text-ink-mute">{subtitle}</p>}
        </div>
        {filterLabel && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear filter: ${filterLabel}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent-ink hover:opacity-80"
          >
            {filterLabel} <span aria-hidden>×</span>
          </button>
        )}
      </div>
      <div style={{ height }} className="min-w-0">
        {empty ? (
          <div className="flex h-full items-center justify-center text-xs text-ink-mute">No data in this period.</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/**
 * Conversion funnel drawn as bars (HTML, so it is tappable, labelled and works at any width). Each bar is a
 * stage; the right-hand figure is how much of the previous stage reached it.
 */
export function FunnelBars({
  stages,
  selected,
  onSelect,
}: {
  stages: FunnelStage[];
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <ol className="flex h-full flex-col justify-between gap-1.5">
      {stages.map((s, i) => {
        const active = selected === s.key;
        return (
          <li key={s.key} className="min-h-0 flex-1">
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(active ? null : s.key)}
              aria-pressed={active}
              aria-label={`${s.label}: ${s.value}${i > 0 ? `, ${s.pctOfPrevious}% of the previous stage` : ""}`}
              className={cn("group flex h-full w-full items-center gap-2 rounded-md text-left", selected && !active && "opacity-40")}
            >
              <span className="w-24 shrink-0 truncate text-[11px] font-semibold text-ink-soft">{s.label}</span>
              <span className="relative h-full min-h-[22px] flex-1 overflow-hidden rounded bg-ink/5">
                <span
                  className="absolute inset-y-0 left-0 rounded bg-accent transition-[width] duration-300 group-hover:brightness-95"
                  style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, opacity: 1 - i * 0.12 }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-black tabular-nums text-ink">
                  {s.value}
                </span>
              </span>
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-ink-mute">
                {i === 0 ? "" : `${s.pctOfPrevious}%`}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Progress toward a target with a marker line at the target (e.g. 90% answered in 5 minutes). */
export function TargetMeter({
  value,
  target,
  label,
}: {
  value: number | null;
  target: number;
  label: string;
}) {
  const v = value ?? 0;
  const met = value !== null && v >= target;
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex items-baseline gap-2">
        <span className={cn("text-4xl font-black tabular-nums", value === null ? "text-ink-mute" : met ? "text-accent-ink" : "text-danger")}>
          {value === null ? "–" : `${v}%`}
        </span>
        <span className="text-xs text-ink-mute">{label}</span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, v)}
        aria-label={label}
        className="relative h-3 overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", met ? "bg-accent" : "bg-danger")}
          style={{ width: `${Math.min(100, v)}%` }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${Math.min(100, target)}%` }} aria-hidden />
      </div>
      <p className="text-[11px] text-ink-mute">Target {target}%</p>
    </div>
  );
}

/** Overview wrapper: heading, optional range toggle and a collapse button (remembered per screen). */
export function OverviewSection({
  id,
  range,
  onRangeChange,
  children,
}: {
  id: string;
  range?: number;
  onRangeChange?: (days: number) => void;
  children: React.ReactNode;
}) {
  const storageKey = `vrooma.overview.${id}`;
  // Phones start collapsed so the table is reachable first; the choice is remembered.
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "open") setOpen(true);
      else if (saved === "closed") setOpen(false);
      else setOpen(window.innerWidth >= 768);
    } catch {
      setOpen(window.innerWidth >= 768);
    }
  }, [storageKey]);

  const toggle = () => {
    setOpen((o) => {
      try {
        window.localStorage.setItem(storageKey, o ? "closed" : "open");
      } catch {
        /* storage unavailable: the choice just is not remembered */
      }
      return !o;
    });
  };

  return (
    <section aria-label="Overview" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-black text-ink">Overview</h2>
        {onRangeChange && range !== undefined && (
          <div role="group" aria-label="Date range" className="ml-1 flex items-center rounded-md border border-border bg-surface p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={range === d}
                onClick={() => onRangeChange(d)}
                className={cn(
                  "h-8 rounded px-2.5 text-[11px] font-bold",
                  range === d ? "bg-dark text-white" : "text-ink-soft hover:bg-ink/5"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="ml-auto inline-flex h-9 items-center rounded-md px-2.5 text-[11px] font-bold text-ink-soft hover:bg-ink/5"
        >
          {open ? "Hide charts" : "Show charts"}
        </button>
      </div>
      {open && children}
    </section>
  );
}
