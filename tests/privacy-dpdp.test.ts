import { describe, it, expect } from "vitest";
import {
  POLICY_VERSION,
  computeConsentTextHash,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/server/privacy/consent";
import { tradeInSubmissionSchema } from "@/lib/validation/trade-in";
import { normalizeIndianPhone } from "@/lib/phone";
import { RETENTION_POLICIES } from "@/server/privacy/retention";

describe("DPDP Act 2023 Statutory Privacy & Consent Guarantees", () => {
  it("enforces statutory policy version 2026.1", () => {
    expect(POLICY_VERSION).toBe("2026.1");
  });

  it("computes deterministic SHA-256 hash of statutory consent text", () => {
    const textA = "I consent to Vrooma processing my phone number for test drive bookings.";
    const textB = "I consent to Vrooma processing my phone number for service appointments.";

    const hashA1 = computeConsentTextHash(textA);
    const hashA2 = computeConsentTextHash(textA);
    const hashB = computeConsentTextHash(textB);

    expect(hashA1).toHaveLength(64);
    expect(hashA1).toBe(hashA2);
    expect(hashA1).not.toBe(hashB);
  });

  it("provides deterministic fallback hash for default consent statements", () => {
    const defaultHash = computeConsentTextHash();
    expect(defaultHash).toHaveLength(64);
    expect(defaultHash).toBe(computeConsentTextHash(undefined));
  });

  describe("HMAC One-Click Unsubscribe Tokens", () => {
    it("generates and verifies tamper-proof unsubscribe tokens", () => {
      const email = "customer@lucknow.org";
      const token = generateUnsubscribeToken(email);

      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const verified = verifyUnsubscribeToken(token);
      expect(verified).toBe("customer@lucknow.org");
    });

    it("verifies idempotently multiple times without burning", () => {
      const email = "repeat-optout@vrooma.in";
      const token = generateUnsubscribeToken(email);

      expect(verifyUnsubscribeToken(token)).toBe(email);
      expect(verifyUnsubscribeToken(token)).toBe(email);
    });

    it("rejects tampered or forged tokens", () => {
      const token = generateUnsubscribeToken("real@vrooma.in");
      const tampered = token.slice(0, -4) + "XXXX";

      expect(verifyUnsubscribeToken(tampered)).toBeNull();
      expect(verifyUnsubscribeToken("invalid-base64-random-junk")).toBeNull();
      expect(verifyUnsubscribeToken("")).toBeNull();
    });
  });

  describe("Trade-In Intake & File Upload Security", () => {
    it("validates valid trade-in submission schema", () => {
      const valid = {
        make: "Honda",
        model: "City ZX",
        year: 2022,
        km: 32000,
        condition: "good" as const,
        name: "Rohit Verma",
        phone: "9876543210",
        consent: true as const,
        photos: ["uploads/car1.jpg"],
      };

      const result = tradeInSubmissionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe("+919876543210");
      }
    });

    it("rejects year older than 2000 or in the future", () => {
      const tooOld = {
        make: "Maruti",
        model: "800",
        year: 1998,
        km: 80000,
        condition: "fair" as const,
        name: "User",
        phone: "9876543210",
        consent: true as const,
      };

      const futureYear = {
        make: "Hyundai",
        model: "Creta",
        year: new Date().getFullYear() + 2,
        km: 5000,
        condition: "excellent" as const,
        name: "User",
        phone: "9876543210",
        consent: true as const,
      };

      expect(tradeInSubmissionSchema.safeParse(tooOld).success).toBe(false);
      expect(tradeInSubmissionSchema.safeParse(futureYear).success).toBe(false);
    });

    it("rejects absurd kilometer readings (> 500,000 km)", () => {
      const absurdKm = {
        make: "Toyota",
        model: "Innova",
        year: 2018,
        km: 650000,
        condition: "good" as const,
        name: "Driver",
        phone: "9876543210",
        consent: true as const,
      };

      const res = tradeInSubmissionSchema.safeParse(absurdKm);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0]?.message).toContain("500,000");
      }
    });

    it("enforces mandatory DPDP consent checkbox on intake", () => {
      const noConsent = {
        make: "Tata",
        model: "Nexon",
        year: 2021,
        km: 25000,
        condition: "good" as const,
        name: "Owner",
        phone: "9876543210",
        consent: false,
      };

      expect(tradeInSubmissionSchema.safeParse(noConsent).success).toBe(false);
    });
  });

  describe("Data Retention & Statutory Cooling-off Thresholds", () => {
    it("configures statutory retention periods per legal guidelines", () => {
      expect(RETENTION_POLICIES.LEAD_ANONYMIZATION_MONTHS).toBe(24);
      expect(RETENTION_POLICIES.OUTBOX_PURGE_DAYS).toBe(90);
      expect(RETENTION_POLICIES.IDEMPOTENCY_PURGE_DAYS).toBe(7);
    });
  });
});
