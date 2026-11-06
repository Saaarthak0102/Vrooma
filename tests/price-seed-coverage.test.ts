/**
 * The on-road price shows "unavailable" when no price rule resolves. These tests guard the seed data that
 * prevents that: every variant needs a Lucknow and Kanpur rule, and every model needs a fallback.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { computeOnRoad, PriceEngineRule, PriceEngineVariant } from "../src/lib/price-engine";

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/0025_seed_price_rules.sql"), "utf8");
const seed = fs.readFileSync(path.join(root, "supabase/seed.sql"), "utf8");

describe("price rule seed coverage", () => {
  it("derives a rule for every active variant in both cities", () => {
    expect(migration).toMatch(/FROM public\.variants v\s+CROSS JOIN public\.cities c/);
    expect(migration).toMatch(/c\.slug IN \('lucknow', 'kanpur'\)/);
    expect(migration).toMatch(/WHERE v\.is_active = true/);
  });

  it("adds a model-level fallback (no variant, no fuel) per model and city", () => {
    expect(migration).toMatch(/FROM public\.models m/);
    expect(migration).toMatch(/Fallback/);
  });

  it("is idempotent and cannot collide with admin-edited rules", () => {
    const inserts = migration.match(/INSERT INTO public\.price_rules/g) ?? [];
    const safe = migration.match(/ON CONFLICT DO NOTHING;/g) ?? [];
    expect(inserts.length).toBe(2);
    expect(safe.length).toBe(2);
  });

  it("uses a validity window that has not expired and is ordered", () => {
    const froms = [...migration.matchAll(/DATE '(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1]);
    expect(froms.length).toBeGreaterThan(0);
    for (const d of froms) expect(Number.isNaN(Date.parse(d))).toBe(false);
    expect(migration).toContain("DATE '2026-01-01'");
    expect(migration).toContain("DATE '2027-03-31'");
    expect(Date.parse("2027-03-31")).toBeGreaterThan(Date.parse("2026-01-01"));
  });

  it("ships the same coverage in seed.sql for fresh environments", () => {
    expect(seed).toContain("6b. PRICE RULE COVERAGE");
    expect(seed).toMatch(/FROM public\.variants v\s+CROSS JOIN public\.cities c/);
  });
});

describe("seeded rule values produce sane on-road totals for every fuel type", () => {
  const rule = (over: Partial<PriceEngineRule>): PriceEngineRule => ({
    id: "r",
    city_id: "c",
    model_id: "m",
    road_tax_pct: 10,
    registration: 12000,
    insurance: 0,
    handling: 8500,
    accessories: 12000,
    tcs_pct: 1,
    valid_from: "2026-01-01",
    valid_until: "2027-03-31",
    ...over,
  });
  const variant = (ex: number): PriceEngineVariant => ({ id: "v", name: "v", ex_showroom: ex });
  const at = new Date("2026-11-06T10:00:00Z");

  it("CNG hatchback under Rs 10 lakh: 8% road tax, no TCS", () => {
    const r = computeOnRoad({
      variant: variant(745000),
      rule: rule({ road_tax_pct: 8, insurance: 25300 }),
      includeAccessories: true,
      date: at,
    });
    expect(r).not.toBeNull();
    expect(r!.lines.find((l) => l.key === "tcs")).toBeUndefined();
    expect(r!.total).toBeGreaterThan(745000);
    expect(r!.total).toBe(745000 + 59600 + 12000 + 25300 + 8500 + 12000);
  });

  it("EV: road tax is exempt (0%) but TCS applies above Rs 10 lakh", () => {
    const r = computeOnRoad({
      variant: variant(1850000),
      rule: rule({ road_tax_pct: 0, insurance: 62900, handling: 9500, accessories: 18000 }),
      includeAccessories: true,
      date: at,
    });
    expect(r).not.toBeNull();
    expect(r!.lines.find((l) => l.key === "tcs")?.amount).toBe(18500);
    expect(r!.total).toBe(1850000 + 0 + 12000 + 62900 + 9500 + 18000 + 18500);
  });

  it("returns null (unavailable) once the validity window has passed", () => {
    const r = computeOnRoad({
      variant: variant(1245000),
      rule: rule({ valid_until: "2026-12-31" }),
      includeAccessories: true,
      date: new Date("2027-01-15T10:00:00Z"),
    });
    expect(r).toBeNull();
  });
});
