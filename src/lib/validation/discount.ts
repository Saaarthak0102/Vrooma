/**
 * src/lib/validation/discount.ts
 *
 * Dealership policy enforcement for lead messages and first-reply drafts.
 * Prohibits quoting unapproved discounts, price cuts, or waivers.
 * Respects word boundaries in both English and Devanagari (Hindi) to prevent false positives.
 */

// Explicit regex patterns matching unapproved discount phrases
const FORBIDDEN_DISCOUNT_PATTERNS: RegExp[] = [
  // English words and phrases with strict word boundaries
  /\bdiscounts?\b/i,
  /\bprice\s+cuts?\b/i,
  /\bwaivers?\b/i,
  /\bcashbacks?\b/i,
  /\bfree\s+of\s+charge\b/i,
  /\b(?:percent|%)\s+off\b/i,
  /\b\d+\s*%\s*(?:off|discount)\b/i,
  /\b(?:\d+|rs\.?|inr|₹)\s*(?:%|\s*)\s*off\b/i,
  /\b(?:special|cash|flat|corporate)\s+discount\b/i,

  // Hindi explicit discount words with Devanagari boundaries
  /(?<!\p{Script=Devanagari})(?:छूट|डिस्काउंट|डिस्काउन्ट)(?!\p{Script=Devanagari})/gu,

  // Hindi price reduction expressions with Devanagari boundaries (excluding idioms 'कम समय में' and 'कम से कम')
  /(?<!\p{Script=Devanagari})(?<!से\s+)कम(?!\s+(?:समय|से\s+कम))(?!\p{Script=Devanagari})/gu,
  /\d+\s*%\s*(?:छूट|कम)/u,
];

// Standalone "off" with word boundaries (avoids office, offer, offering, coffee)
const STANDALONE_OFF_REGEX = /\boff\b/i;

export const FORBIDDEN_DISCOUNT_WORDS: readonly string[] = [
  "discount",
  "discounts",
  "price cut",
  "price cuts",
  "waiver",
  "waivers",
  "cashback",
  "cashbacks",
  "free of charge",
  "% off",
  "percent off",
  "छूट",
  "डिस्काउंट",
  "कम",
];

export function findForbiddenDiscountWord(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Check patterns that must be blocked
  for (const pattern of FORBIDDEN_DISCOUNT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // 2. Standalone "off" check (excluding service-related non-discount phrases like "drop off")
  if (STANDALONE_OFF_REGEX.test(trimmed)) {
    const lower = trimmed.toLowerCase();
    // Exclude legitimate non-discount contexts for "off"
    const isLegitimateOff =
      lower.includes("drop off") ||
      lower.includes("drop-off") ||
      lower.includes("pick and drop") ||
      lower.includes("turn off") ||
      lower.includes("switched off");

    if (!isLegitimateOff) {
      return "off";
    }
  }

  return null;
}

export function containsForbiddenDiscountWords(text: string): boolean {
  return findForbiddenDiscountWord(text) !== null;
}
