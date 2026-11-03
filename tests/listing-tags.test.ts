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
    describe("when SUV_EV_TAG_OVERRIDES_OTHERS is true (default)", () => {
      it("resolves SUV to 'familyFriendly' overriding featured, offer, and new arrival", () => {
        const tag = newCarTag({
          isFeatured: true,
          hasActiveOffer: true,
          createdAt: "2026-11-01T00:00:00+05:30",
          bodyType: "suv",
          now: referenceDate,
        });
        expect(tag).toBe("familyFriendly");
      });

      it("resolves EV by bodyType to 'ecoFriendly' overriding featured, offer, and new arrival", () => {
        const tag = newCarTag({
          isFeatured: true,
          hasActiveOffer: true,
          createdAt: "2026-11-01T00:00:00+05:30",
          bodyType: "ev",
          now: referenceDate,
        });
        expect(tag).toBe("ecoFriendly");
      });

      it("resolves EV by all variants fuel=ev to 'ecoFriendly'", () => {
        const tag = newCarTag({
          isFeatured: false,
          hasActiveOffer: false,
          bodyType: "hatchback",
          variants: [{ fuel: "ev" }, { fuel: "ev" }],
          now: referenceDate,
        });
        expect(tag).toBe("ecoFriendly");
      });

      it("EV beats SUV when a model is both (e.g. electric SUV)", () => {
        const tag = newCarTag({
          isFeatured: false,
          hasActiveOffer: false,
          bodyType: "suv",
          variants: [{ fuel: "ev" }, { fuel: "ev" }],
          now: referenceDate,
        });
        expect(tag).toBe("ecoFriendly");
      });

      it("keeps standard hierarchy for sedan and hatchback", () => {
        // Featured wins for sedan
        const tagFeatured = newCarTag({
          isFeatured: true,
          hasActiveOffer: true,
          createdAt: "2026-11-01T00:00:00+05:30",
          bodyType: "sedan",
          now: referenceDate,
        });
        expect(tagFeatured).toBe("featured");

        // Offer wins when not featured for hatchback
        const tagOffer = newCarTag({
          isFeatured: false,
          hasActiveOffer: true,
          createdAt: "2026-11-01T00:00:00+05:30",
          bodyType: "hatchback",
          now: referenceDate,
        });
        expect(tagOffer).toBe("offer");

        // New arrival wins when within 60 days
        const tagArrival = newCarTag({
          isFeatured: false,
          hasActiveOffer: false,
          createdAt: "2026-09-15T00:00:00+05:30",
          bodyType: "hatchback",
          now: referenceDate,
        });
        expect(tagArrival).toBe("newArrival");

        // Fallback to bodyType for older sedan
        const tagFallback = newCarTag({
          isFeatured: false,
          hasActiveOffer: false,
          createdAt: "2025-01-01T00:00:00+05:30",
          bodyType: "sedan",
          now: referenceDate,
        });
        expect(tagFallback).toEqual({ bodyType: "sedan" });
      });
    });

    describe("when SUV_EV_TAG_OVERRIDES_OTHERS is false", () => {
      it("prioritizes featured over SUV and EV", () => {
        const tagSuv = newCarTag({
          isFeatured: true,
          bodyType: "suv",
          overrideSuvEv: false,
          now: referenceDate,
        });
        expect(tagSuv).toBe("featured");

        const tagEv = newCarTag({
          isFeatured: true,
          bodyType: "ev",
          overrideSuvEv: false,
          now: referenceDate,
        });
        expect(tagEv).toBe("featured");
      });

      it("prioritizes offer over SUV and EV", () => {
        const tag = newCarTag({
          isFeatured: false,
          hasActiveOffer: true,
          bodyType: "suv",
          overrideSuvEv: false,
          now: referenceDate,
        });
        expect(tag).toBe("offer");
      });

      it("prioritizes new arrival over SUV and EV", () => {
        const tag = newCarTag({
          isFeatured: false,
          hasActiveOffer: false,
          createdAt: "2026-10-15T00:00:00+05:30",
          bodyType: "suv",
          overrideSuvEv: false,
          now: referenceDate,
        });
        expect(tag).toBe("newArrival");
      });

      it("falls back to familyFriendly for SUV and ecoFriendly for EV when no priority tags match", () => {
        const tagSuv = newCarTag({
          isFeatured: false,
          hasActiveOffer: false,
          createdAt: "2025-01-01T00:00:00+05:30",
          bodyType: "suv",
          overrideSuvEv: false,
          now: referenceDate,
        });
        expect(tagSuv).toBe("familyFriendly");

        const tagEv = newCarTag({
          isFeatured: false,
          hasActiveOffer: false,
          createdAt: "2025-01-01T00:00:00+05:30",
          bodyType: "ev",
          overrideSuvEv: false,
          now: referenceDate,
        });
        expect(tagEv).toBe("ecoFriendly");
      });
    });

    it("respects exact NEW_ARRIVAL_DAYS boundary (60 days) for non-SUV/non-EV", () => {
      // 60 days before 2026-11-03 is 2026-09-04
      const tagOnBoundary = newCarTag({
        isFeatured: false,
        hasActiveOffer: false,
        createdAt: "2026-09-04T12:00:00+05:30",
        bodyType: "sedan",
        now: referenceDate,
      });
      expect(tagOnBoundary).toBe("newArrival");

      // 61 days before 2026-11-03 is 2026-09-03
      const tagExpired = newCarTag({
        isFeatured: false,
        hasActiveOffer: false,
        createdAt: "2026-09-03T12:00:00+05:30",
        bodyType: "sedan",
        now: referenceDate,
      });
      expect(tagExpired).toEqual({ bodyType: "sedan" });
    });

    it("falls back to { bodyType } when no special condition matches (e.g. mpv)", () => {
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
      expect(hasAccentDot("familyFriendly")).toBe(false);
      expect(hasAccentDot("ecoFriendly")).toBe(false);
      expect(hasAccentDot("lowKms")).toBe(false);
      expect(hasAccentDot("oneOwner")).toBe(false);
      expect(hasAccentDot("inspected")).toBe(false);
      expect(hasAccentDot({ bodyType: "sedan" })).toBe(false);
      expect(hasAccentDot(null)).toBe(false);
    });
  });
});

