import { describe, it, expect } from "vitest";
import { normalizeCityId, LUCKNOW_CITY_ID, KANPUR_CITY_ID } from "@/lib/cities";

describe("normalizeCityId", () => {
  it("maps slugs and legacy mock ids to UUIDs", () => {
    expect(normalizeCityId("lucknow")).toBe(LUCKNOW_CITY_ID);
    expect(normalizeCityId("city-lucknow")).toBe(LUCKNOW_CITY_ID);
    expect(normalizeCityId("City-Kanpur")).toBe(KANPUR_CITY_ID);
  });
  it("passes valid UUIDs through", () => {
    expect(normalizeCityId(KANPUR_CITY_ID)).toBe(KANPUR_CITY_ID);
  });
  it("rejects unknown or empty values", () => {
    expect(normalizeCityId("delhi")).toBeNull();
    expect(normalizeCityId("")).toBeNull();
    expect(normalizeCityId(undefined)).toBeNull();
  });
});
