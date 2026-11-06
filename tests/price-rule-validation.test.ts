import { describe, it, expect } from "vitest";
import { priceRuleSchema } from "@/lib/validation/price-rule";

const valid = {
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
};

describe("price rule validation (admin table feeds every on-road price)", () => {
  it("accepts a normal rule", () => {
    expect(priceRuleSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects fractional rupees", () => {
    expect(priceRuleSchema.safeParse({ ...valid, insurance: 42000.5 }).success).toBe(false);
  });

  it("rejects negative amounts and an impossible road-tax percentage", () => {
    expect(priceRuleSchema.safeParse({ ...valid, handling: -1 }).success).toBe(false);
    expect(priceRuleSchema.safeParse({ ...valid, road_tax_pct: 95 }).success).toBe(false);
  });

  it("rejects a validity window that ends before it starts", () => {
    const res = priceRuleSchema.safeParse({ ...valid, valid_from: "2026-12-31", valid_until: "2026-01-01" });
    expect(res.success).toBe(false);
  });
});
