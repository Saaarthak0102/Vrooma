import { describe, it, expect } from "vitest";
import {
  newCarTag,
  usedCarTag,
  hasAccentDot,
  diffDaysKolkata,
} from "@/lib/listing-tags";
import {
  NEW_ARRIVAL_DAYS,
  JUST_LISTED_DAYS,
  LOW_KM_THRESHOLD,
} from "@/lib/constants";

describe("listing-tags pure logic", () => {
  const referenceDate = new Date("2026-11-03T12:00:00+05:30");

  describe("diffDaysKolkata", () => {
    it("returns 0 for the same date", () => {
      expect(
        diffDaysKolkata("2026-11-03T01:00:00+05:30", "2026-11-03T23:00:00+05:30")
      ).toBe(0);
    });

    it("returns 1 for yesterday", () => {
      expect(
        diffDaysKolkata("2026-11-02T10:00:00+05:30", "2026-11-03T10:00:00+05:30")
      ).toBe(1);
    });

    it("handles boundary near midnight across timezone correctly", () => {
      // 2026-11-03 00:30 IST is 2026-11-02 19:00 UTC
      expect(
        diffDaysKolkata(
          "2026-11-02T23:30:00+05:30",
          "2026-11-03T01:00:00+05:30"
        )
      ).toBe(1);
    });
  });

  describe("newCarTag", () => {
    it("prioritizes 'featured' over active offer and new arrival", () => {
      const tag = newCarTag({
        isFeatured: true,
        hasActiveOffer: true,
        createdAt: "2026-11-01T00:00:00+05:30",
        bodyType: "sedan",
        now: referenceDate,
      });
      expect(tag).toBe("featured");
    });

    it("prioritizes 'offer' over new arrival when not featured", () => {
      const tag = newCarTag({
        isFeatured: false,
        hasActiveOffer: true,
        createdAt: "2026-11-01T00:00:00+05:30",
        bodyType: "suv",
        now: referenceDate,
      });
      expect(tag).toBe("offer");
    });

    it("returns 'newArrival' when created within NEW_ARRIVAL_DAYS (60 days)", () => {
      const tag = newCarTag({
        isFeatured: false,
        hasActiveOffer: false,
        createdAt: "2026-09-15T00:00:00+05:30", // 49 days ago
        bodyType: "hatchback",
        now: referenceDate,
      });
      expect(tag).toBe("newArrival");
    });

    it("respects exact NEW_ARRIVAL_DAYS boundary (60 days)", () => {
      // 60 days before 2026-11-03 is 2026-09-04
      const tagOnBoundary = newCarTag({
        isFeatured: false,
        hasActiveOffer: false,
        createdAt: "2026-09-04T12:00:00+05:30",
        bodyType: "ev",
        now: referenceDate,
      });
      expect(tagOnBoundary).toBe("newArrival");

      // 61 days before 2026-11-03 is 2026-09-03
      const tagExpired = newCarTag({
        isFeatured: false,
        hasActiveOffer: false,
        createdAt: "2026-09-03T12:00:00+05:30",
        bodyType: "ev",
        now: referenceDate,
      });
      expect(tagExpired).toEqual({ bodyType: "ev" });
    });

    it("falls back to { bodyType } when no special condition matches", () => {
      const tag = newCarTag({
        isFeatured: false,
        hasActiveOffer: false,
        createdAt: "2025-01-01T00:00:00+05:30",
        bodyType: "mpv",
        now: referenceDate,
      });
      expect(tag).toEqual({ bodyType: "mpv" });
    });
  });

  describe("usedCarTag", () => {
    it("prioritizes 'justListed' over lowKms, oneOwner, and inspected", () => {
      const tag = usedCarTag({
        listedAt: "2026-10-28T00:00:00+05:30", // 6 days ago (<= 14)
        km: 12000,
        owners: 1,
        inspectionScore: 95,
        now: referenceDate,
      });
      expect(tag).toBe("justListed");
    });

    it("respects JUST_LISTED_DAYS boundary (14 days)", () => {
      // 14 days before 2026-11-03 is 2026-10-20
      const tag14 = usedCarTag({
        listedAt: "2026-10-20T12:00:00+05:30",
        km: 40000,
        owners: 2,
        inspectionScore: 85,
        now: referenceDate,
      });
      expect(tag14).toBe("justListed");

      // 15 days before is 2026-10-19
      const tag15 = usedCarTag({
        listedAt: "2026-10-19T12:00:00+05:30",
        km: 40000,
        owners: 2,
        inspectionScore: 85,
        now: referenceDate,
      });
      expect(tag15).toBe("inspected");
    });

    it("prioritizes 'lowKms' over oneOwner and inspected when not just listed", () => {
      const tag = usedCarTag({
        listedAt: "2026-06-01T00:00:00+05:30",
        km: LOW_KM_THRESHOLD, // 25,000 km threshold
        owners: 1,
        inspectionScore: 92,
        now: referenceDate,
      });
      expect(tag).toBe("lowKms");
    });

    it("prioritizes 'oneOwner' when km > 25,000 and owners === 1", () => {
      const tag = usedCarTag({
        listedAt: "2026-05-01T00:00:00+05:30",
        km: 25001,
        owners: 1,
        inspectionScore: 90,
        now: referenceDate,
      });
      expect(tag).toBe("oneOwner");
    });

    it("returns 'inspected' when owners > 1, km > 25k, and inspectionScore exists", () => {
      const tag = usedCarTag({
        listedAt: "2026-05-01T00:00:00+05:30",
        km: 50000,
        owners: 2,
        inspectionScore: 88,
        now: referenceDate,
      });
      expect(tag).toBe("inspected");
    });

    it("returns null when no conditions match (e.g. no inspection score, high km, multiple owners, old listing)", () => {
      const tag = usedCarTag({
        listedAt: "2025-01-01T00:00:00+05:30",
        km: 70000,
        owners: 3,
        inspectionScore: 0,
        now: referenceDate,
      });
      expect(tag).toBeNull();

      const tagNullScore = usedCarTag({
        listedAt: "2025-01-01T00:00:00+05:30",
        km: 70000,
        owners: 3,
        inspectionScore: null,
        now: referenceDate,
      });
      expect(tagNullScore).toBeNull();
    });
  });

  describe("hasAccentDot", () => {
    it("returns true only for featured, offer, and justListed", () => {
      expect(hasAccentDot("featured")).toBe(true);
      expect(hasAccentDot("offer")).toBe(true);
      expect(hasAccentDot("justListed")).toBe(true);
      expect(hasAccentDot("newArrival")).toBe(false);
      expect(hasAccentDot("lowKms")).toBe(false);
      expect(hasAccentDot("oneOwner")).toBe(false);
      expect(hasAccentDot("inspected")).toBe(false);
      expect(hasAccentDot({ bodyType: "sedan" })).toBe(false);
      expect(hasAccentDot(null)).toBe(false);
    });
  });
});

