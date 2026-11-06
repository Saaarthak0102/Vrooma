/**
 * tests/discount-rules.test.ts
 *
 * Executable twin of docs/backend/DISCOUNT_RULES.md. Every row of the table in that document is a row here.
 * `blocked` = findForbiddenDiscountWord() returns a match = the reply cannot be sent.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { findForbiddenDiscountWord, containsForbiddenDiscountWords } from "@/lib/validation/discount";

type Row = { text: string; blocked: boolean; note?: string };

export const DISCOUNT_CASES: Row[] = [
  // ---- Hindi: must be blocked ------------------------------------------------------------------
  { text: "कम कीमत में", blocked: true },
  { text: "कम दाम", blocked: true },
  { text: "छूट मिलेगी", blocked: true },
  { text: "डिस्काउंट", blocked: true },
  { text: "डिस्काउन्ट मिल जाएगा", blocked: true },
  { text: "इस कार पर 5% छूट है", blocked: true },
  { text: "हम दाम कम कर देंगे", blocked: true },
  { text: "आपको छूट नहीं मिलेगी", blocked: true, note: "mentions the word while refusing: over-blocked by design" },
  { text: "कम ब्याज दर पर लोन", blocked: true, note: "loan rate, not car price: over-blocked by design" },
  // ---- Hindi: must be allowed ------------------------------------------------------------------
  { text: "कम समय में", blocked: false },
  { text: "कम से कम दो दिन", blocked: false },
  { text: "गाड़ी कम समय में तैयार हो जाएगी", blocked: false },
  { text: "5 साल से कम पुरानी गाड़ी", blocked: false },
  { text: "कमल नगर शोरूम", blocked: false, note: "word boundary: कमल is a different word" },
  { text: "आपकी टेस्ट ड्राइव कल सुबह 11 बजे बुक है", blocked: false },
  // ---- English: must be blocked ----------------------------------------------------------------
  { text: "10% off", blocked: true },
  { text: "Flat 5% discount for you", blocked: true },
  { text: "We can offer a discount on this car", blocked: true },
  { text: "DISCOUNTS available", blocked: true, note: "case-insensitive" },
  { text: "We cannot offer any discount", blocked: true, note: "mentions the word while refusing: over-blocked by design" },
  { text: "This is a price cut of 50,000", blocked: true },
  { text: "Price cuts this week", blocked: true },
  { text: "Registration fee waiver available", blocked: true },
  { text: "Get cashback of 10,000 on delivery", blocked: true },
  { text: "Take 20 percent off", blocked: true },
  { text: "Rs 5000 off on accessories", blocked: true },
  { text: "Free of charge handling package", blocked: true },
  { text: "Please switch off the engine", blocked: true, note: "bare word `off` is hard-blocked per the brief; rephrase" },
  { text: "Our showroom is off Kanpur Road", blocked: true, note: "address use of `off` is blocked by design; write 'near Kanpur Road'" },
  // ---- English: must be allowed ----------------------------------------------------------------
  { text: "Our office opens at 9", blocked: false },
  { text: "Namaste Aditya, your test drive is confirmed for tomorrow 11 AM.", blocked: false },
  { text: "Would you like tea or coffee during your showroom tour?", blocked: false },
  { text: "We are offering exclusive colour choices for Model H.", blocked: false },
  { text: "Please bring your driving licence for the test drive", blocked: false },
  { text: "EMI starts at 18,500 per month", blocked: false },
  { text: "Please drop off the car at 10 am", blocked: false, note: "explicit service exception" },
  { text: "Pick and drop is available for service", blocked: false, note: "explicit service exception" },
  { text: "special offer on accessories", blocked: false, note: "OWNER DECISION: allowed. The rule is about quoting a discount; 'offer' is a normal word. Flagged in DISCOUNT_RULES.md" },
  { text: "A free test drive is available", blocked: false, note: "only 'free of charge' is blocked, plain 'free' is not" },
];

/** Price-reduction wording the filter does NOT catch today. Documented so the owner can decide. */
export const KNOWN_GAPS: Row[] = [
  { text: "कीमत में कमी हो सकती है", blocked: false, note: "कमी (reduction) is a different word from कम" },
  { text: "We can reduce the price for you", blocked: false },
  { text: "Best deal, lowest price guaranteed", blocked: false },
];

describe("discount filter: documented sentence table", () => {
  it("has at least 30 documented sentences", () => {
    expect(DISCOUNT_CASES.length).toBeGreaterThanOrEqual(30);
  });

  it.each(DISCOUNT_CASES)("$text -> $blocked", ({ text, blocked }) => {
    expect(containsForbiddenDiscountWords(text)).toBe(blocked);
    expect(findForbiddenDiscountWord(text) !== null).toBe(blocked);
  });

  it.each(KNOWN_GAPS)("known gap: $text is currently allowed", ({ text }) => {
    expect(containsForbiddenDiscountWords(text)).toBe(false);
  });

  it("returns the offending fragment so the UI can show it", () => {
    expect(findForbiddenDiscountWord("Flat 5% discount for you")).toMatch(/discount/i);
    expect(findForbiddenDiscountWord("छूट मिलेगी")).toBe("छूट");
  });

  it("ignores empty and non-string input", () => {
    expect(findForbiddenDiscountWord("")).toBeNull();
    expect(findForbiddenDiscountWord("   ")).toBeNull();
    // @ts-expect-error runtime guard
    expect(findForbiddenDiscountWord(undefined)).toBeNull();
  });
});

describe("discount filter: one function for UI and server", () => {
  const root = process.cwd();
  const ui = fs.readFileSync(path.join(root, "src/components/staff/ReplyDraftEditor.tsx"), "utf8");
  const action = fs.readFileSync(path.join(root, "src/server/actions/leads.ts"), "utf8");

  it("the editor warning and sendLeadReplyAction import from the same module", () => {
    expect(ui).toContain('from "@/lib/validation/discount"');
    expect(action).toContain('from "@/lib/validation/discount"');
  });

  it("neither re-implements the check with its own regex or word list", () => {
    for (const src of [ui, action]) {
      // no regex literal / RegExp built from discount vocabulary (UI copy that mentions the words is fine)
      expect(src).not.toMatch(/\/[^/\n]*\\b[^/\n]*(?:discount|waiver|cashback)[^/\n]*\/[gimsuy]*/i);
      expect(src).not.toMatch(/new RegExp\(/);
    }
  });

  it("both call findForbiddenDiscountWord (the exact same function)", () => {
    expect(ui).toContain("findForbiddenDiscountWord(");
    expect(action).toContain("findForbiddenDiscountWord(");
  });
});
