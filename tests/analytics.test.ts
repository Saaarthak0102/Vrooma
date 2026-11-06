import { describe, expect, it } from "vitest";
import { bandCounts, bucketByDay, countBy, funnelFromStatuses, istDay, pct } from "@/lib/analytics";

describe("analytics helpers", () => {
  it("countBy sorts by count and groups empties", () => {
    const rows = ["a", "b", "a", "", "a", "b"];
    const out = countBy(rows, (r) => r, { fallback: "None" });
    expect(out.map((s) => [s.key, s.value])).toEqual([["a", 3], ["b", 2], ["None", 1]]);
  });

  it("countBy folds the tail into Other when limited", () => {
    const rows = ["a", "a", "b", "c", "d"];
    const out = countBy(rows, (r) => r, { limit: 2 });
    expect(out).toHaveLength(3);
    expect(out[2]).toMatchObject({ key: "__other", value: 2 });
  });

  it("bucketByDay zero-fills and uses India days", () => {
    const now = Date.parse("2026-11-07T10:00:00+05:30");
    const rows = [
      { at: "2026-11-07T00:30:00+05:30" }, // IST Nov 7, but Nov 6 in UTC
      { at: "2026-11-07T09:00:00+05:30" },
      { at: "2026-11-05T12:00:00+05:30" },
      { at: "2026-10-01T12:00:00+05:30" }, // outside the window
    ];
    const out = bucketByDay(rows, (r) => r.at, 3, now);
    expect(out.map((d) => d.day)).toEqual(["2026-11-05", "2026-11-06", "2026-11-07"]);
    expect(out.map((d) => d.total)).toEqual([1, 0, 2]);
  });

  it("bucketByDay splits by series", () => {
    const now = Date.parse("2026-11-07T10:00:00+05:30");
    const rows = [
      { at: "2026-11-07T09:00:00+05:30", k: "x" },
      { at: "2026-11-07T09:30:00+05:30", k: "y" },
      { at: "2026-11-07T09:40:00+05:30", k: "x" },
    ];
    const out = bucketByDay(rows, (r) => r.at, 1, now, (r) => r.k);
    expect(out[0]).toMatchObject({ total: 3, x: 2, y: 1 });
  });

  it("funnel is cumulative and reports step conversion", () => {
    const stages = [
      { key: "new", label: "New" },
      { key: "contacted", label: "Contacted" },
      { key: "won", label: "Won" },
    ];
    const out = funnelFromStatuses(["new", "new", "contacted", "won", "lost"], stages);
    expect(out.map((s) => s.value)).toEqual([4, 2, 1]);
    expect(out.map((s) => s.pctOfPrevious)).toEqual([100, 50, 50]);
  });

  it("funnel handles empty input", () => {
    const out = funnelFromStatuses([], [{ key: "new", label: "New" }, { key: "won", label: "Won" }]);
    expect(out.map((s) => s.value)).toEqual([0, 0]);
    expect(out[1].pctOfPrevious).toBe(0);
  });

  it("pct never divides by zero", () => {
    expect(pct(1, 0)).toBe(0);
    expect(pct(1, 4)).toBe(25);
  });

  it("bandCounts places values in ascending bands", () => {
    const bands = [
      { key: "lo", label: "Low", max: 5 },
      { key: "mid", label: "Mid", max: 10 },
      { key: "hi", label: "High", max: Infinity },
    ];
    expect(bandCounts([1, 5, 6, 99], bands).map((b) => b.value)).toEqual([2, 1, 1]);
  });

  it("istDay returns a YYYY-MM-DD string", () => {
    expect(istDay("2026-11-07T20:00:00Z")).toBe("2026-11-08"); // 01:30 IST next day
  });
});
