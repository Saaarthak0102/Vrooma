import { describe, it, expect } from "vitest";
import { computeOnRoad } from "@/lib/price-engine";
import { isEmptyRuleRow } from "@/server/repositories/pricing";

/**
 * Regression: in DEV only 3 variants have a price rule. For every other variant resolve_price_rule returns an
 * all-null composite, which used to become a rule with 0% tax / zero fees and no validity date, so the site
 * displayed "on-road = ex-showroom" (for example Model H VX Manual at 10,95,000).
 */
describe("no matching price rule must never produce a price", () => {
  const variant = { id: "v1", name: "VX Manual", ex_showroom: 1095000 };
  const allNull = {
    id: null, city_id: null, model_id: null, variant_id: null, fuel: null,
    road_tax_pct: null, registration: null, insurance: null, handling: null, accessories: null,
    tcs_pct: null, valid_from: null, valid_until: null, notes: null,
  };

  it("recognises the all-null composite PostgREST returns when nothing matches", () => {
    expect(isEmptyRuleRow(allNull)).toBe(true);
    expect(isEmptyRuleRow(null)).toBe(true);
    expect(isEmptyRuleRow(undefined)).toBe(true);
    expect(isEmptyRuleRow({})).toBe(true);
  });

  it("accepts a real rule row", () => {
    expect(isEmptyRuleRow({ id: "r1", valid_from: "2026-01-01", valid_until: "2026-12-31" })).toBe(false);
  });

  it("computeOnRoad refuses a rule without a validity window", () => {
    const hollow = {
      id: "x", city_id: "c", road_tax_pct: 0, registration: 0, insurance: 0, handling: 0, accessories: 0,
      valid_from: null as unknown as string, valid_until: null as unknown as string,
    };
    expect(computeOnRoad({ variant, rule: hollow })).toBeNull();
  });

  it("computeOnRoad still prices a valid rule", () => {
    const rule = {
      id: "r1", city_id: "c", road_tax_pct: 10, registration: 5000, insurance: 40000, handling: 8000, accessories: 0,
      tcs_pct: 1, valid_from: "2000-01-01", valid_until: "2999-12-31",
    };
    const result = computeOnRoad({ variant, rule });
    expect(result).not.toBeNull();
    expect(result!.total).toBeGreaterThan(variant.ex_showroom);
    expect(result!.validUntil).toBe("2999-12-31");
  });
});
