import { describe, it, expect } from "vitest";
import { computeOnRoad, PriceEngineVariant, PriceEngineRule } from "../src/lib/price-engine";

describe("price engine", () => {
  const sampleVariant: PriceEngineVariant = {
    id: "var-h-zx-at",
    name: "Model H ZX Automatic",
    ex_showroom: 1245000,
  };

  const sampleRule: PriceEngineRule = {
    id: "rule-lucknow-h",
    city_id: "city-lucknow",
    model_id: "model-h",
    road_tax_pct: 10,
    registration: 12000,
    insurance: 42000,
    handling: 8500,
    accessories: 15000,
    tcs_pct: 1,
    valid_from: "2026-01-01",
    valid_until: "2026-12-31",
    notes: "Official Lucknow RTO rates 2026",
  };

  it("computes full on-road price breakup for sample car NEW-H-02", () => {
    const result = computeOnRoad({
      variant: sampleVariant,
      rule: sampleRule,
      includeAccessories: true,
      date: "2026-06-15",
    });

    expect(result).not.toBeNull();
    if (!result) return;

    // Road tax 10% of 1245000 = 124500
    // TCS 1% of 1245000 = 12450
    // Registration = 12000
    // Insurance = 42000
    // Handling = 8500
    // Accessories = 15000
    // Total = 1245000 + 124500 + 12000 + 42000 + 8500 + 15000 + 12450 = 1459450
    expect(result.total).toBe(1459450);
    expect(result.validUntil).toBe("2026-12-31");
    expect(result.source).toBe("price_rules");
    expect(result.lines.find((l) => l.key === "road_tax")?.amount).toBe(124500);
    expect(result.lines.find((l) => l.key === "tcs")?.amount).toBe(12450);
    expect(result.lines.find((l) => l.key === "accessories")?.amount).toBe(15000);
  });

  it("excludes accessories when includeAccessories is false", () => {
    const result = computeOnRoad({
      variant: sampleVariant,
      rule: sampleRule,
      includeAccessories: false,
      date: "2026-06-15",
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.lines.find((l) => l.key === "accessories")).toBeUndefined();
    expect(result.total).toBe(1459450 - 15000);
  });

  it("returns null when no rule is provided (prompts 'Contact showroom')", () => {
    const result = computeOnRoad({
      variant: sampleVariant,
      rule: null,
      date: "2026-06-15",
    });
    expect(result).toBeNull();
  });

  it("returns null when rule is expired", () => {
    const result = computeOnRoad({
      variant: sampleVariant,
      rule: sampleRule,
      date: "2027-01-01", // Past valid_until 2026-12-31
    });
    expect(result).toBeNull();
  });

  it("correctly rounds floating point road tax and TCS percentages", () => {
    const fractionalRule: PriceEngineRule = {
      ...sampleRule,
      road_tax_pct: 9.75, // 1245000 * 0.0975 = 121387.5 -> 121388
      tcs_pct: 0.75,       // 1245000 * 0.0075 = 9337.5 -> 9338
      accessories: 0,
    };

    const result = computeOnRoad({
      variant: sampleVariant,
      rule: fractionalRule,
      date: "2026-06-15",
    });

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.lines.find((l) => l.key === "road_tax")?.amount).toBe(121388);
    expect(result.lines.find((l) => l.key === "tcs")?.amount).toBe(9338);
  });
  it("does not charge TCS on cars at or below Rs 10,00,000 ex-showroom", () => {
    for (const exShowroom of [850000, 1000000]) {
      const result = computeOnRoad({
        variant: { ...sampleVariant, ex_showroom: exShowroom },
        rule: sampleRule,
        includeAccessories: false,
      });
      expect(result!.lines.find((l) => l.key === "tcs")).toBeUndefined();
    }
  });

  it("charges TCS just above the Rs 10,00,000 threshold", () => {
    const result = computeOnRoad({
      variant: { ...sampleVariant, ex_showroom: 1000001 },
      rule: sampleRule,
      includeAccessories: false,
    });
    expect(result!.lines.find((l) => l.key === "tcs")?.amount).toBe(10000);
  });
});
