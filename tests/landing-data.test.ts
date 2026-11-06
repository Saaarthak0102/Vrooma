import { describe, it, expect } from "vitest";
import { getLandingData } from "@/server/landing-data";
import { computeOnRoad } from "@/lib/price-engine";
import { calculateEmi } from "@/lib/emi";

describe("Landing Data Engine (Phase 2)", () => {
  it("getLandingData returns no reg_no_private anywhere in used car payload", async () => {
    const data = await getLandingData();

    // 1. Check usedSample
    expect(data.usedSample).toBeDefined();
    if (data.usedSample) {
      expect((data.usedSample as any).reg_no_private).toBeUndefined();
      expect(data.usedSample.reg_no_masked).toBeDefined();
      expect(data.usedSample.reg_no_masked).toContain("**");
    }

    // 2. Deep check entire serialized object for any full UP32 plate
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("UP32BC4120");
    expect(serialized).not.toContain("reg_no_private");
  });

  it("teaser returns null when no valid rule is found or rule is missing", () => {
    const variant = { id: "test-var", name: "Test Variant", ex_showroom: 1000000 };

    // Missing rule
    const nullResult = computeOnRoad({
      variant,
      rule: null,
    });
    expect(nullResult).toBeNull();

    // Expired rule
    const expiredRule = {
      id: "rule-expired",
      city_id: "city-lucknow",
      road_tax_pct: 10,
      registration: 10000,
      insurance: 40000,
      handling: 5000,
      accessories: 10000,
      valid_from: "2020-01-01",
      valid_until: "2020-12-31",
    };
    const expiredResult = computeOnRoad({
      variant,
      rule: expiredRule,
      date: new Date("2026-06-01"),
    });
    expect(expiredResult).toBeNull();
  });

  it("EMI defaults produce a positive instalment", async () => {
    const data = await getLandingData();
    expect(data.emiDefaults.monthlyEmi).toBeGreaterThan(0);
    expect(data.emiDefaults.principal).toBeGreaterThan(0);
    expect(data.emiDefaults.label).toBe("indicative");

    // Arithmetic verification
    const verifiedEmi = calculateEmi(
      data.emiDefaults.principal,
      data.emiDefaults.ratePct,
      data.emiDefaults.tenureMonths
    );
    expect(data.emiDefaults.monthlyEmi).toBe(verifiedEmi);
  });

  it("returns authentic showrooms, workshops, and certified used yard in locations", async () => {
    const data = await getLandingData();
    expect(data.locations.length).toBeGreaterThanOrEqual(6);
    expect(data.locations.some((l) => l.type === "showroom")).toBe(true);
    expect(data.locations.some((l) => l.type === "workshop")).toBe(true);
    expect(data.locations.some((l) => l.type === "yard")).toBe(true);
  });

  it("returns valid bookNowPreview for final CTA phone screen without hardcoded hours", async () => {
    const data = await getLandingData();
    expect(data.bookNowPreview).toBeDefined();
    expect(data.bookNowPreview.showrooms.length).toBe(2);
    expect(data.bookNowPreview.showrooms[0].name).toBeTruthy();
    expect(data.bookNowPreview.showrooms[0].area).toBeTruthy();
    expect(typeof data.bookNowPreview.showrooms[0].openNow).toBe("boolean");
    expect(data.bookNowPreview.showrooms[0].label).toMatch(/^(Open now - closes|Opens)\s+\d+/);

    expect(Array.isArray(data.bookNowPreview.slots)).toBe(true);
    if (data.bookNowPreview.slots.length > 0) {
      expect(data.bookNowPreview.slots[0].timeFormatted).toMatch(/(am|pm)/i);
    }
  });
});
