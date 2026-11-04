import { describe, it, expect } from "vitest";
import { getISTDayRangeUTC } from "@/server/repositories/slots";
import { normalizeVehicleReg, maskVehicleReg } from "@/lib/validation/vehicle";

describe("Phase 4: Booking & Slots Engine", () => {
  describe("IST Timezone Day Boundaries", () => {
    it("correctly computes UTC boundaries for an IST calendar day", () => {
      // 2026-11-05 in IST (UTC+05:30)
      const range = getISTDayRangeUTC("2026-11-05");

      // 00:00:00.000 IST is 2026-11-04 18:30:00.000 UTC
      expect(range.startUTC).toBe("2026-11-04T18:30:00.000Z");

      // 23:59:59.999 IST is 2026-11-05 18:29:59.999 UTC
      expect(range.endUTC).toBe("2026-11-05T18:29:59.999Z");
    });

    it("ensures a 23:30 IST appointment falls strictly within the correct IST date range", () => {
      const range = getISTDayRangeUTC("2026-11-05");

      // 23:30 IST on 5 Nov 2026 = 18:00 UTC on 5 Nov 2026
      const lateEveningSlotUTC = "2026-11-05T18:00:00.000Z";

      expect(new Date(lateEveningSlotUTC).getTime()).toBeGreaterThanOrEqual(new Date(range.startUTC).getTime());
      expect(new Date(lateEveningSlotUTC).getTime()).toBeLessThanOrEqual(new Date(range.endUTC).getTime());
    });
  });

  describe("Vehicle Registration Normalization & DPDP Masking", () => {
    it("validates and normalizes valid Indian vehicle registrations", () => {
      expect(normalizeVehicleReg("up 32 ab 1234")).toBe("UP32AB1234");
      expect(normalizeVehicleReg("UP-32-AB-1234")).toBe("UP32AB1234");
      expect(normalizeVehicleReg("dl01a1234")).toBe("DL01A1234");
      expect(normalizeVehicleReg("22bh1234aa")).toBe("22BH1234AA");
    });

    it("rejects invalid registration strings", () => {
      expect(normalizeVehicleReg("12345")).toBeNull();
      expect(normalizeVehicleReg("XYZ123")).toBeNull();
      expect(normalizeVehicleReg("")).toBeNull();
      expect(normalizeVehicleReg(null)).toBeNull();
    });

    it("masks private vehicle registration plates for DPDP compliance", () => {
      expect(maskVehicleReg("UP32AB1234")).toBe("UP32 ** **** 1234");
      expect(maskVehicleReg("DL01CA9999")).toBe("DL01 ** **** 9999");
      expect(maskVehicleReg("22BH1234AA")).toBe("22BH ** **** 34AA");
      expect(maskVehicleReg("")).toBe("");
    });
  });
});

