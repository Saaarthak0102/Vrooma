"use client";

import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Slice } from "@/lib/analytics";

/** Series colours. CSS variables so the charts follow the theme (light and dark). */
export const CHART_COLORS = [
  "var(--accent)",
  "#3B82F6",
  "var(--warn)",
  "#8B5CF6",
  "var(--danger)",
  "#14B8A6",
  "#64748B",
];

const tooltipStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--ink)",
  boxShadow: "0 4px 16px rgba(0,0,0,.12)",
};
const axisTick = { fontSize: 11, fill: "var(--ink-soft)" };

export interface SelectProps {
  /** Key of the currently selected slice/bar; others are dimmed. */
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}

const dim = (selected: string | null | undefined, key: string) => (selected && selected !== key ? 0.3 : 1);

export function DonutChart({
  data,
  selected,
  onSelect,
  colorOf,
  centerLabel,
}: { data: Slice[]; colorOf?: (key: string, index: number) => string; centerLabel?: string } & SelectProps) {
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="88%"
            cy="42%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            onClick={(d: any) => onSelect?.(selected === d.key ? null : d.key)}
            cursor={onSelect ? "pointer" : undefined}
          >
            {data.map((d, i) => (
              <Cell
                key={d.key}
                fill={colorOf ? colorOf(d.key, i) : CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={dim(selected, d.key)}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, n: string) => [`${v} (${total ? Math.round((v / total) * 100) : 0}%)`, n]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "var(--ink-soft)", cursor: onSelect ? "pointer" : undefined }}
            onClick={(e: any) => {
              const slice = data.find((d) => d.label === e.value);
              if (slice) onSelect?.(selected === slice.key ? null : slice.key);
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 text-center">
        <div className="text-xl font-black leading-none text-ink tabular-nums">{total}</div>
        {centerLabel && <div className="mt-0.5 text-[10px] text-ink-mute">{centerLabel}</div>}
      </div>
    </div>
  );
}

export interface BarSeries {
  key: string;
  label: string;
  color?: string;
}

type Row = Record<string, string | number>;

/** Bars. With `series` they are stacked; without, one bar per category carrying `value` and a `key`. */
export function BarsChart({
  data,
  series,
  selected,
  onSelect,
  horizontal,
  colorOf,
  unit,
}: {
  data: Row[];
  series?: BarSeries[];
  horizontal?: boolean;
  colorOf?: (row: Row, index: number) => string;
  unit?: string;
} & SelectProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 0 : -18 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={!horizontal} vertical={Boolean(horizontal)} />
        {/* No fragments inside Recharts charts: it finds axes/series by scanning direct children. */}
        {/* Props are spread, never passed as `undefined`: an explicit undefined would override Recharts' defaults. */}
        <XAxis
          allowDecimals={false}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          {...(horizontal ? { type: "number" as const } : { dataKey: "label", interval: "preserveStartEnd" as const })}
        />
        <YAxis
          allowDecimals={false}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          {...(horizontal ? { type: "category" as const, dataKey: "label", width: 120 } : {})}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "var(--accent-soft)", opacity: 0.5 }}
          formatter={(v: number, n: string) => [`${v}${unit ?? ""}`, n === "value" ? "Count" : n]}
        />
        {series ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--ink-soft)" }} /> : null}
        {series
          ? series.map((s, i) => (
              <Bar
                isAnimationActive={false}
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="a"
                fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))
          : null}
        {series ? null : (
          <Bar
            isAnimationActive={false}
            dataKey="value"
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            cursor={onSelect ? "pointer" : undefined}
            onClick={(d: any) => onSelect?.(selected === d.key ? null : d.key)}
          >
            {data.map((row, i) => (
              <Cell
                key={String(row.key ?? i)}
                fill={colorOf ? colorOf(row, i) : CHART_COLORS[0]}
                fillOpacity={dim(selected, String(row.key))}
              />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data, series }: { data: Row[]; series: BarSeries[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`trend-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--ink-soft)" }} />}
        {series.map((s, i) => (
          <Area
            isAnimationActive={false}
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? CHART_COLORS[i]}
            strokeWidth={2}
            fill={`url(#trend-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
