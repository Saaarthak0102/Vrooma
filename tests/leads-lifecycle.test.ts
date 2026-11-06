import { describe, it, expect } from "vitest";
import { containsForbiddenDiscountWords } from "@/lib/validation/discount";
import { BRIEF_LEAK_CONSTANTS } from "@/lib/leak-constants";

describe("Phase 4: Leads Pipeline & Guardrails", () => {
  describe("AI Safety & Discount Guardrail Enforcement", () => {
    it("detects English forbidden discount words in drafts and replies", () => {
      expect(containsForbiddenDiscountWords("Can we offer you a special discount?")).toBe(true);
      expect(containsForbiddenDiscountWords("Exclusive price cut available today.")).toBe(true);
      expect(containsForbiddenDiscountWords("We will provide a registration fee waiver.")).toBe(true);
      expect(containsForbiddenDiscountWords("Get 10% off on your booking.")).toBe(true);
      expect(containsForbiddenDiscountWords("Extra cashback applicable on delivery.")).toBe(true);
    });

    it("detects Hindi forbidden discount words in drafts and replies", () => {
      expect(containsForbiddenDiscountWords("क्या इस गाड़ी पर कोई विशेष छूट मिलेगी?")).toBe(true);
      expect(containsForbiddenDiscountWords("कीमत थोड़ी कम हो सकती है।")).toBe(true);
    });

    it("allows compliant automotive communication without discount mentions", () => {
      expect(containsForbiddenDiscountWords("Namaste Aditya, your test drive is confirmed for tomorrow 11 AM.")).toBe(false);
      expect(containsForbiddenDiscountWords("Please visit our Hazratganj showroom for variant demonstration.")).toBe(false);
      expect(containsForbiddenDiscountWords("गाड़ी का ऑन-रोड प्राइस ब्रेकअप संलग्न है।")).toBe(false);
      
      // Specifically required non-discount words in Section 4:
      expect(containsForbiddenDiscountWords("Please visit our showroom office in Hazratganj.")).toBe(false);
      expect(containsForbiddenDiscountWords("We have a special festive offer for test drive participants.")).toBe(false);
      expect(containsForbiddenDiscountWords("We are offering exclusive color choices for Model H.")).toBe(false);
      expect(containsForbiddenDiscountWords("Would you like tea or coffee during your showroom tour?")).toBe(false);
      expect(containsForbiddenDiscountWords("गाड़ी कम समय में तैयार होकर मिल जाएगी।")).toBe(false);
      expect(containsForbiddenDiscountWords("कम से कम 24 घंटे पहले अपनी टेस्ट ड्राइव बुक करें।")).toBe(false);
    });

    it("strictly blocks required discount variations in English and Hindi", () => {
      expect(containsForbiddenDiscountWords("We can offer a 5 percent off on accessories.")).toBe(true);
      expect(containsForbiddenDiscountWords("Special 15% discount for you.")).toBe(true);
      expect(containsForbiddenDiscountWords("Free of charge handling package.")).toBe(true);
      expect(containsForbiddenDiscountWords("इस दिवाली पर ₹20,000 की विशेष छूट उपलब्ध है।")).toBe(true);
      expect(containsForbiddenDiscountWords("हम आपके लिए 5% छूट करवा देंगे।")).toBe(true);
      expect(containsForbiddenDiscountWords("शोरूम आकर बात करें, हम दाम कम कर देंगे।")).toBe(true);
    });
  });

  describe("Dealer Principal Leakage Constants", () => {
    it("matches the exact brief formulas for ₹2.11 crore revenue leak", () => {
      // 1. Sales Leads Leak: 1,350 delayed × 4% lost conversion = 54 cars lost × ₹25,000 margin
      const monthlySalesLeak = BRIEF_LEAK_CONSTANTS.carsLostPerMonthDelayed * BRIEF_LEAK_CONSTANTS.dealerMarginPerCarINR;
      expect(monthlySalesLeak).toBe(1350000); // ₹13.5 Lakh / month
      expect(monthlySalesLeak * 12).toBe(16200000); // ₹1.62 Crore / year

      // 2. Service Calls Leak: 300 migrating owners × ₹4,500 bill × 30% margin
      const monthlyServiceLeak = 300 * BRIEF_LEAK_CONSTANTS.avgServiceBillINR * (BRIEF_LEAK_CONSTANTS.serviceMarginPct / 100);
      expect(monthlyServiceLeak).toBe(405000); // ₹4.05 Lakh / month
      expect(monthlyServiceLeak * 12).toBe(4860000); // ₹48.6 Lakh / year

      // Total annual leakage = ₹1.62 Cr + ₹48.6 Lakh = ₹2.106 Cr ≈ ₹2.11 Crore
      expect(BRIEF_LEAK_CONSTANTS.totalAnnualLeakINR).toBe(16200000 + 4860000);
    });
  });
});

