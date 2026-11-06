import { describe, it, expect } from "vitest";
import { computePriceBand, type PastSale } from "@/lib/price-band";

const sale = (over: Partial<PastSale> = {}): PastSale => ({
  model_name: "Model C",
  year: 2022,
  fuel: "diesel",
  km: 40_000,
  sold_price: 800_000,
  ...over,
});

const subject = { model_name: "Model C", year: 2022, fuel: "diesel", km: 40_000 };

describe("computePriceBand", () => {
  it("returns null when there are no comparable sales, rather than inventing a band", () => {
    expect(computePriceBand(subject, [])).toBeNull();
    expect(computePriceBand(subject, [sale({ model_name: "Model S" })])).toBeNull();
    expect(computePriceBand(subject, [sale({ year: 2017 })])).toBeNull();
    expect(computePriceBand(subject, [sale({ fuel: "petrol" })])).toBeNull();
  });

  it("reports the real sample size and a low confidence for one or two sales", () => {
    const band = computePriceBand(subject, [sale()])!;
    expect(band.sampleSize).toBe(1);
    expect(band.confidence).toBe("low");
    expect(band.rationale).toContain("1 past sale ");
  });

  it("grows confidence with more comparable sales", () => {
    const three = computePriceBand(subject, [sale(), sale(), sale()])!;
    const five = computePriceBand(subject, Array.from({ length: 5 }, () => sale()))!;
    expect(three.confidence).toBe("medium");
    expect(five.confidence).toBe("high");
  });

  it("keeps low <= median <= high and rounds to the nearest 1,000", () => {
    const band = computePriceBand(subject, [
      sale({ sold_price: 760_000 }),
      sale({ sold_price: 800_000 }),
      sale({ sold_price: 845_000 }),
      sale({ sold_price: 910_000 }),
    ])!;
    expect(band.low).toBeLessThanOrEqual(band.median);
    expect(band.median).toBeLessThanOrEqual(band.high);
    for (const v of [band.low, band.median, band.high]) expect(v % 1000).toBe(0);
  });

  it("values a lower-mileage subject above the same past sale", () => {
    const history = [sale({ km: 80_000, sold_price: 700_000 })];
    const highMileage = computePriceBand({ ...subject, km: 80_000 }, history)!;
    const lowMileage = computePriceBand({ ...subject, km: 20_000 }, history)!;
    expect(lowMileage.median).toBeGreaterThan(highMileage.median);
  });

  it("values a newer subject above an older past sale", () => {
    const history = [sale({ year: 2020, sold_price: 700_000 })];
    const newer = computePriceBand({ ...subject, year: 2022 }, history)!;
    expect(newer.median).toBeGreaterThan(700_000);
  });
});
