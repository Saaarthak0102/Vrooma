"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bot, CheckCircle2, Gauge, ShieldAlert, XCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import {
  DEFAULT_FILTERS,
  STATUS_LABELS,
  capUsageToday,
  featureLabel,
  filterActivity,
  previewOf,
  reasonLabel,
  reasonOf,
  summarize,
  type ActivityFilters,
  type AiActivityRow,
  type AiActivityStatus,
  type DateRange,
} from "@/lib/ai-activity";
import type { AiActivitySettings } from "@/server/repositories/ai-logs";

const STATUS_VARIANT: Record<AiActivityStatus, "ok" | "secondary" | "warn" | "danger"> = {
  ok: "ok",
  fallback: "secondary",
  blocked: "warn",
  error: "danger",
};

const RANGES: { id: DateRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

const whenFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Kolkata",
});

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });

const ms = (v: number | null) => (v === null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`);

function StatusBadge({ status }: { status: AiActivityStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="whitespace-nowrap px-2 py-0.5 text-[10px]">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function AiActivityPanel({
  rows,
  truncated,
  settings,
  generatedAt,
}: {
  rows: AiActivityRow[];
  truncated: boolean;
  settings: AiActivitySettings;
  /** Server time the rows were read, so "today" and the ranges match on server and client. */
  generatedAt: string;
}) {
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);

  const calls = useMemo(() => rows.filter((r) => !r.action.startsWith("reply_sent_")), [rows]);
  const filtered = useMemo(() => filterActivity(calls, filters, now), [calls, filters, now]);
  const days = filters.range === "today" ? 1 : filters.range === "7d" ? 7 : 30;
  const summary = useMemo(() => summarize(filtered, now, Math.min(days, 14)), [filtered, now, days]);
  const usage = useMemo(() => capUsageToday(calls, now), [calls, now]);
  const features = useMemo(() => [...new Set(calls.map((r) => r.feature))].sort(), [calls]);
  const open = openId ? (rows.find((r) => r.id === openId) ?? null) : null;

  const set = (patch: Partial<ActivityFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const maxDay = Math.max(1, ...summary.perDay.map((d) => d.total));

  const tiles: { label: string; value: string; hint: string; icon: React.ReactNode; status: AiActivityStatus | "all" }[] = [
    { label: "Model calls", value: String(summary.total), hint: summary.successRate === null ? "none yet" : `${summary.successRate}% answered`, icon: <Activity className="h-4 w-4" />, status: "all" },
    { label: "Answered", value: String(summary.ok), hint: `median ${ms(summary.medianLatencyMs)}`, icon: <CheckCircle2 className="h-4 w-4" />, status: "ok" },
    { label: "Rule-based", value: String(summary.fallback), hint: "quota, cap or timeout", icon: <Gauge className="h-4 w-4" />, status: "fallback" },
    { label: "Blocked", value: String(summary.blocked), hint: "stopped by a guard", icon: <ShieldAlert className="h-4 w-4" />, status: "blocked" },
    { label: "Failed", value: String(summary.error), hint: "model error or timeout", icon: <XCircle className="h-4 w-4" />, status: "error" },
  ];

  const columns: GridColumn<AiActivityRow>[] = [
    {
      id: "time",
      header: "Time (IST)",
      accessor: (r) => r.createdAt,
      cell: (r) => <span className="tabular-nums text-ink-soft">{whenFmt.format(new Date(r.createdAt))}</span>,
    },
    { id: "feature", header: "Feature", accessor: (r) => featureLabel(r.feature), filter: "select", cell: (r) => <span className="font-semibold text-ink">{featureLabel(r.feature)}</span> },
    { id: "status", header: "Result", accessor: (r) => STATUS_LABELS[r.status], cell: (r) => <StatusBadge status={r.status} /> },
    {
      id: "detail",
      header: "What happened",
      accessor: (r) => `${reasonLabel(reasonOf(r))} ${previewOf(r)}`,
      className: "min-w-[18rem] max-w-[28rem]",
      cell: (r) => {
        const reason = reasonLabel(reasonOf(r));
        return (
          <span className="block max-w-[28rem] truncate text-ink-soft" title={previewOf(r, 400)}>
            {reason && <span className="mr-1 font-semibold text-ink">{reason}.</span>}
            {previewOf(r)}
          </span>
        );
      },
    },
    { id: "model", header: "Model", accessor: (r) => r.model ?? "", className: "text-ink-soft" },
    { id: "latency", header: "Time taken", accessor: (r) => r.latencyMs, align: "right", cell: (r) => ms(r.latencyMs) },
    { id: "tokens", header: "Tokens in/out", accessor: (r) => (r.inputTokens ?? 0) + (r.outputTokens ?? 0), align: "right", cell: (r) => (r.inputTokens === null ? "—" : `${r.inputTokens}/${r.outputTokens ?? 0}`) },
  ];

  return (
    <div className="space-y-5">
      {/* Setup line: what is running and what limits apply */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-[11px] text-ink-soft shadow-card">
        <Badge variant={settings.enabled ? "ok" : "danger"} className="px-2 py-0.5 text-[10px]">
          {settings.enabled ? "AI on" : "AI off (no key)"}
        </Badge>
        <span>
          <span className="font-semibold text-ink">{settings.provider === "google" ? "Google Gemini" : "Anthropic"}</span>
          {" · "}
          {settings.fastModel === settings.smartModel ? settings.fastModel : `${settings.fastModel} (chat, notes) · ${settings.smartModel} (briefings, agent)`}
        </span>
        <span>{settings.maxRpm > 0 ? `${settings.maxRpm} calls a minute max` : "no per-minute ceiling set"}</span>
        <span>{settings.dailyCapPerFeature} calls a day per feature</span>
        <span>
          Waits {Math.round(settings.timeoutFastMs / 1000)} s (chat) / {Math.round(settings.timeoutSmartMs / 1000)} s (briefings)
        </span>
      </div>

      {/* Range */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={filters.range === r.id}
            onClick={() => set({ range: r.id })}
            className={`inline-flex h-11 items-center rounded-md px-4 text-xs font-bold transition-colors ${filters.range === r.id ? "bg-dark text-white" : "border border-border bg-surface text-ink-soft hover:bg-ink/5 hover:text-ink"}`}
          >
            {r.label}
          </button>
        ))}
        {(filters.feature !== "all" || filters.status !== "all") && (
          <button
            type="button"
            onClick={() => set({ feature: "all", status: "all" })}
            className="inline-flex h-11 items-center rounded-md px-3 text-xs font-semibold text-accent underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary tiles: tap one to filter the table to it */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t, i) => {
          const active = filters.status === t.status && t.status !== "all";
          return (
            <button
              key={t.label}
              type="button"
              aria-pressed={active}
              onClick={() => set({ status: active ? "all" : t.status })}
              className={`min-h-11 rounded-xl border p-4 text-left shadow-card transition-colors ${i === 0 ? "col-span-2 sm:col-span-1" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/50"}`}
            >
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-ink-mute">
                {t.icon}
                {t.label}
              </dt>
              <dd className="mt-1 text-2xl font-black tabular-nums text-ink">{t.value}</dd>
              <p className="text-[10px] text-ink-mute">{t.hint}</p>
            </button>
          );
        })}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calls per day */}
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft">Calls per day</h2>
          <div className="mt-3 flex h-24 items-end gap-1.5" role="img" aria-label={`Calls per day: ${summary.perDay.map((d) => d.total).join(", ")}`}>
            {summary.perDay.map((d) => (
              <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.day}: ${d.total} calls, ${d.problems} not answered`}>
                <div className="flex w-full flex-col justify-end overflow-hidden rounded-sm" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: d.total ? 3 : 0 }}>
                  <div className="bg-danger" style={{ flex: d.problems }} />
                  <div className="bg-accent" style={{ flex: d.total - d.problems }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-[9px] text-ink-mute">
            {summary.perDay.map((d) => (
              <span key={d.day} className="min-w-0 flex-1 truncate text-center">
                {dayFmt.format(new Date(`${d.day}T00:00:00Z`))}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-ink-mute">
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent align-middle" /> answered
            <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-danger align-middle" /> not answered · {summary.inputTokens.toLocaleString("en-IN")} tokens in, {summary.outputTokens.toLocaleString("en-IN")} out
          </p>
        </section>

        {/* By feature, with the daily cap meter */}
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft">By feature · today against the daily limit</h2>
          {features.length === 0 ? (
            <p className="mt-3 text-xs text-ink-mute">No calls recorded yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {features.map((f) => {
                const used = usage[f] ?? 0;
                const pct = Math.min(100, Math.round((used / settings.dailyCapPerFeature) * 100));
                const active = filters.feature === f;
                return (
                  <li key={f}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => set({ feature: active ? "all" : f })}
                      className={`w-full min-h-11 rounded-md px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "bg-accent-soft" : "hover:bg-ink/5"}`}
                    >
                      <span className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-ink">{featureLabel(f)}</span>
                        <span className="tabular-nums text-ink-mute">
                          {used} / {settings.dailyCapPerFeature}
                        </span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-border">
                        <span className={`block h-full rounded-full ${pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warn" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {summary.topReasons.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft">Why answers were not used</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.topReasons.map((r) => (
              <li key={r.reason} className="rounded-full border border-border bg-bg px-3 py-1 text-[11px] text-ink">
                {reasonLabel(r.reason)} <span className="font-bold tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {truncated && (
        <p role="status" className="rounded-lg border border-warn bg-surface px-3 py-2 text-xs text-ink">
          More than 1,000 calls in the last 30 days: only the newest 1,000 are shown.
        </p>
      )}

      {/* Every call */}
      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpenId(r.id)}
        activeRowKey={openId}
        searchPlaceholder="Search what happened, lead or feature…"
        exportName="ai-activity"
        emptyMessage="No AI calls match these filters."
      />

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full space-y-4 sm:max-w-xl">
          {open && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="flex flex-wrap items-center gap-2 pr-6 text-lg font-black">
                  <Bot className="h-5 w-5 text-accent" />
                  {featureLabel(open.feature)}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {whenFmt.format(new Date(open.createdAt))} IST · {open.action.replace(/_/g, " ")}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={open.status} />
                {reasonOf(open) && <Badge variant="outline" className="px-2 py-0.5 text-[10px]">{reasonLabel(reasonOf(open))}</Badge>}
              </div>

              <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-bg p-3 text-xs">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-ink-mute">Model</dt>
                  <dd className="break-all font-semibold text-ink">{open.model ?? "none (rule-based)"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-ink-mute">Time taken</dt>
                  <dd className="flex items-center gap-1 font-semibold text-ink">
                    <Zap className="h-3 w-3 text-accent" />
                    {ms(open.latencyMs)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-ink-mute">Tokens in</dt>
                  <dd className="font-semibold tabular-nums text-ink">{open.inputTokens ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-ink-mute">Tokens out</dt>
                  <dd className="font-semibold tabular-nums text-ink">{open.outputTokens ?? "—"}</dd>
                </div>
              </dl>

              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Input (redacted description)</h3>
                <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-border bg-bg p-3 text-xs text-ink">{open.prompt || "—"}</p>
              </section>

              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{open.status === "ok" ? "Output" : "Output or reason"}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-border bg-bg p-3 text-xs text-ink">{open.response || "—"}</p>
              </section>

              {open.leadId && (
                <Link
                  href={`/staff?lead=${open.leadId}`}
                  className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-xs font-bold text-accent-ink hover:bg-ink/5"
                >
                  Open {open.customerName ?? "lead"} {open.leadRef ? `(${open.leadRef})` : ""}
                </Link>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
