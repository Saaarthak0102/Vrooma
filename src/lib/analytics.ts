/**
 * Pure aggregation helpers behind the console Overview charts. No React, no I/O, so the numbers on screen are
 * unit-testable. All day bucketing is in India time, because that is when the dealership's day starts and ends.
 */

const IST = "Asia/Kolkata";

export type Slice = { key: string; label: string; value: number };

/** YYYY-MM-DD of an instant, in IST. */
export function istDay(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: IST });
}

/** Counts rows per key, largest first. Rows whose key is empty are grouped under `fallback`. */
export function countBy<T>(
  rows: T[],
  keyOf: (row: T) => string | null | undefined,
  options: { labelOf?: (key: string) => string; fallback?: string; limit?: number } = {}
): Slice[] {
  const fallback = options.fallback ?? "Other";
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row) || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ key, label: options.labelOf ? options.labelOf(key) : key, value }));
  if (options.limit && sorted.length > options.limit) {
    const head = sorted.slice(0, options.limit);
    const rest = sorted.slice(options.limit).reduce((n, s) => n + s.value, 0);
    return [...head, { key: "__other", label: "Other", value: rest }];
  }
  return sorted;
}

/** One entry per IST day in the last `days` days (oldest first), zero-filled, counting rows by `dateOf`. */
export function bucketByDay<T>(
  rows: T[],
  dateOf: (row: T) => string,
  days: number,
  now: number = Date.now(),
  seriesOf?: (row: T) => string
): Array<{ day: string; total: number } & Record<string, number | string>> {
  const out = new Map<string, { day: string; total: number } & Record<string, number | string>>();
  for (let i = days - 1; i >= 0; i--) {
    const day = istDay(now - i * 86_400_000);
    out.set(day, { day, total: 0 });
  }
  for (const row of rows) {
    const bucket = out.get(istDay(dateOf(row)));
    if (!bucket) continue;
    bucket.total += 1;
    if (seriesOf) {
      const s = seriesOf(row);
      bucket[s] = ((bucket[s] as number) ?? 0) + 1;
    }
  }
  return [...out.values()];
}

export interface FunnelStage {
  key: string;
  label: string;
  /** Leads that reached this stage or any later one. */
  value: number;
  /** Share of the previous stage that reached this one (100 for the first). */
  pctOfPrevious: number;
}

/**
 * Cumulative funnel: a lead that is "negotiating" also counts as having been contacted. Lost leads are not part
 * of the funnel (they left it); they are returned separately by the caller.
 */
export function funnelFromStatuses(
  statuses: string[],
  stages: Array<{ key: string; label: string }>
): FunnelStage[] {
  const rank = new Map(stages.map((s, i) => [s.key, i]));
  const reached = stages.map(() => 0);
  for (const status of statuses) {
    const r = rank.get(status);
    if (r === undefined) continue;
    for (let i = 0; i <= r; i++) reached[i] += 1;
  }
  return stages.map((s, i) => ({
    key: s.key,
    label: s.label,
    value: reached[i],
    pctOfPrevious: i === 0 ? 100 : reached[i - 1] > 0 ? Math.round((reached[i] / reached[i - 1]) * 100) : 0,
  }));
}

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Puts a numeric value into the first band whose upper bound it does not exceed. Bounds are ascending. */
export function bandCounts(values: number[], bands: Array<{ key: string; label: string; max: number }>): Slice[] {
  const out = bands.map((b) => ({ key: b.key, label: b.label, value: 0 }));
  for (const v of values) {
    const i = bands.findIndex((b) => v <= b.max);
    out[i === -1 ? out.length - 1 : i].value += 1;
  }
  return out;
}
