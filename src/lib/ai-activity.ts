/**
 * Pure helpers behind the admin "AI activity" view: one row per model call (ai_logs), filtering, summary numbers and
 * CSV. No React and no server imports, so they are unit-tested directly and can run in the browser over the rows the
 * server already loaded.
 */

export type AiActivityStatus = "ok" | "fallback" | "blocked" | "error";

export interface AiActivityRow {
  id: string;
  createdAt: string;
  feature: string;
  action: string;
  status: AiActivityStatus;
  model: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** The redacted description stored with the call. Never raw buyer text. */
  prompt: string;
  response: string;
  leadId: string | null;
  leadRef: string | null;
  customerName: string | null;
}

/** Rows that are real model calls. Reply-audit rows (reply_sent_*) are a different view and are not calls. */
export function isModelCall(row: Pick<AiActivityRow, "action">): boolean {
  return !row.action.startsWith("reply_sent_");
}

export const FEATURE_LABELS: Record<string, string> = {
  chat: "Buyer chat",
  lead_summary: "Lead briefing",
  lead_agent: "Next steps agent",
  handoff_brief: "Chat handoff note",
  digest: "Daily digest note",
  price_band_note: "Price band note",
};

export const STATUS_LABELS: Record<AiActivityStatus, string> = {
  ok: "Answered",
  fallback: "Rule-based",
  blocked: "Blocked by guard",
  error: "Failed",
};

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature.replace(/_/g, " ");
}

/** The short reason stored at the start of the response for non-ok calls: "[timeout] ...", "[blocked: discount] ...". */
export function reasonOf(row: Pick<AiActivityRow, "status" | "response">): string | null {
  if (row.status === "ok") return null;
  const m = /^\[([^\]]+)\]/.exec(row.response ?? "");
  if (!m) return null;
  return m[1].replace(/^blocked:\s*/i, "").trim() || null;
}

/** Plain-language version of a reason, for the table and the detail drawer. */
export function reasonLabel(reason: string | null): string {
  if (!reason) return "";
  const map: Record<string, string> = {
    timeout: "Model took too long",
    error: "Model call failed",
    rate_limited: "Quota or rate limit reached",
    unavailable: "Model paused after repeated failures",
    throttled: "Request rate limit",
    over_cap: "Daily limit reached",
    disabled: "AI switched off",
    injection: "Prompt-injection attempt",
    pricing_request: "Price-cut request sent to a consultant",
    discount: "Discount wording blocked",
    ungrounded_amount: "Amount not in the facts",
    disallowed_link: "Link not allowed",
    registration_number: "Registration number blocked",
  };
  return map[reason] ?? reason.replace(/_/g, " ");
}

/** What the call produced or why it did not, without the "[reason]" prefix, trimmed for a table cell. */
export function previewOf(row: AiActivityRow, max = 140): string {
  const text = (row.response || row.prompt || "").replace(/^\[[^\]]+\]\s*/, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export type DateRange = "today" | "7d" | "30d";

export interface ActivityFilters {
  feature: string | "all";
  status: AiActivityStatus | "all";
  range: DateRange;
}

/** Free-text search and CSV export come from the shared DataGrid; these are the filters the summary cards follow. */
export const DEFAULT_FILTERS: ActivityFilters = { feature: "all", status: "all", range: "7d" };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the Indian calendar day containing `now`. */
export function istDayStartOf(now: Date): Date {
  return new Date(Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS);
}

export function rangeStart(range: DateRange, now: Date): Date {
  const today = istDayStartOf(now);
  if (range === "today") return today;
  return new Date(today.getTime() - (range === "7d" ? 6 : 29) * DAY_MS);
}

export function filterActivity(rows: AiActivityRow[], filters: ActivityFilters, now: Date): AiActivityRow[] {
  const from = rangeStart(filters.range, now).getTime();
  return rows.filter((row) => {
    if (new Date(row.createdAt).getTime() < from) return false;
    if (filters.feature !== "all" && row.feature !== filters.feature) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    return true;
  });
}

export interface ActivitySummary {
  total: number;
  ok: number;
  fallback: number;
  blocked: number;
  error: number;
  /** Share of calls that produced a model answer, 0-100, or null with no calls. */
  successRate: number | null;
  medianLatencyMs: number | null;
  p95LatencyMs: number | null;
  inputTokens: number;
  outputTokens: number;
  byFeature: { feature: string; total: number; ok: number; problems: number }[];
  topReasons: { reason: string; count: number }[];
  /** Calls per IST day, oldest first, for a small bar chart. */
  perDay: { day: string; total: number; problems: number }[];
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function summarize(rows: AiActivityRow[], now: Date, days = 7): ActivitySummary {
  const calls = rows.filter(isModelCall);
  const count = (s: AiActivityStatus) => calls.filter((r) => r.status === s).length;
  const latencies = calls
    .filter((r) => r.status === "ok" && r.latencyMs !== null)
    .map((r) => r.latencyMs as number)
    .sort((a, b) => a - b);

  const features = new Map<string, { total: number; ok: number }>();
  const reasons = new Map<string, number>();
  for (const r of calls) {
    const f = features.get(r.feature) ?? { total: 0, ok: 0 };
    f.total += 1;
    if (r.status === "ok") f.ok += 1;
    features.set(r.feature, f);
    const reason = reasonOf(r);
    if (reason) reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  }

  const start = istDayStartOf(now).getTime();
  const perDay = Array.from({ length: days }, (_, i) => {
    const from = start - (days - 1 - i) * DAY_MS;
    const inDay = calls.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= from && t < from + DAY_MS;
    });
    return {
      day: new Date(from + IST_OFFSET_MS).toISOString().slice(0, 10),
      total: inDay.length,
      problems: inDay.filter((r) => r.status !== "ok").length,
    };
  });

  return {
    total: calls.length,
    ok: count("ok"),
    fallback: count("fallback"),
    blocked: count("blocked"),
    error: count("error"),
    successRate: calls.length ? Math.round((count("ok") / calls.length) * 100) : null,
    medianLatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    inputTokens: calls.reduce((s, r) => s + (r.inputTokens ?? 0), 0),
    outputTokens: calls.reduce((s, r) => s + (r.outputTokens ?? 0), 0),
    byFeature: [...features.entries()]
      .map(([feature, v]) => ({ feature, total: v.total, ok: v.ok, problems: v.total - v.ok }))
      .sort((a, b) => b.total - a.total),
    topReasons: [...reasons.entries()].map(([reason, n]) => ({ reason, count: n })).sort((a, b) => b.count - a.count).slice(0, 5),
    perDay,
  };
}

/** Calls made per feature since the start of today (IST): what the daily cap counts (ok, blocked, error; not fallbacks). */
export function capUsageToday(rows: AiActivityRow[], now: Date): Record<string, number> {
  const from = istDayStartOf(now).getTime();
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (!isModelCall(r) || r.status === "fallback") continue;
    if (new Date(r.createdAt).getTime() < from) continue;
    out[r.feature] = (out[r.feature] ?? 0) + 1;
  }
  return out;
}
