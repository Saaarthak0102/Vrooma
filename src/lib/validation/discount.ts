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
  /\bdiscount(?:s|ed|ing)?\b/i,
  /\bwaive[sd]?\b|\bwaiving\b/i,
  /\brebates?\b/i,
  /\bconcessions?\b/i,
  /\bmark(?:ed)?[\s-]?downs?\b/i,
  /\bprice\s+(?:drop|reduction|reduced|slash(?:ed)?)\b/i,
  /\b(?:reduced|lower(?:ed)?|slashed)\s+price\b/i,
  /\bprice\s+cuts?\b/i,
  /\bwaivers?\b/i,
  /\bcashbacks?\b/i,
  /\bfree\s+of\s+charge\b/i,
  /\b(?:percent|%)\s+off\b/i,
  /\b\d+\s*%\s*(?:off|discount)\b/i,
  /\b(?:\d+|rs\.?|inr|₹)\s*(?:%|\s*)\s*off\b/i,
  /\b(?:special|cash|flat|corporate)\s+discount\b/i,

  // Hindi explicit discount words with Devanagari boundaries
  /(?<!\p{Script=Devanagari})(?:सस्ता|सस्ती|सस्ते)(?!\p{Script=Devanagari})/u,
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

/**
 * Normalises text before matching so spacing tricks cannot hide a forbidden word:
 * zero-width characters are removed, compatibility forms (full-width letters etc.) are folded, and runs of
 * whitespace collapse to one space.
 */
function normalizeForCheck(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Phrases where the word "off" is ordinary service language, not a price. They are removed before the
// standalone-"off" check, so a message that mixes one of them with a real "X off" is still blocked.
const LEGITIMATE_OFF_PHRASES = /\b(?:drop[\s-]?off|pick\s+and\s+drop|turn\s+off|switched\s+off)\b/gi;

export function findForbiddenDiscountWord(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = normalizeForCheck(text);
  if (!trimmed) return null;

  // 1. Check patterns that must be blocked
  for (const pattern of FORBIDDEN_DISCOUNT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // 2. Standalone "off", after removing legitimate service phrases (e.g. "drop off")
  if (STANDALONE_OFF_REGEX.test(trimmed.replace(LEGITIMATE_OFF_PHRASES, " "))) {
    return "off";
  }

  return null;
}

/**
 * Price-cut promises that do not use a forbidden word: "I can reduce the price", "a better price", "negotiable",
 * "cheaper", "d i s c o u n t". Checked on AI output and on buyer messages (so a request for one goes to a consultant),
 * not on what staff type. Deliberately narrow: "lower EMI", "best interest rate", "special offer" (the official offers
 * page) and "final on-road price" are ordinary and stay allowed.
 */
const PRICE_CONCESSION_PATTERNS: RegExp[] = [
  /\b(?:reduc(?:e|ed|es|ing)|lower(?:ed|s|ing)?|cut(?:s|ting)?|slash(?:ed|es|ing)?|trim(?:med|ming)?|drop(?:s|ped|ping)?|knock(?:ed|ing)?|bring(?:ing)?\s+down)\s+(?:the\s+|your\s+|its\s+|that\s+|this\s+|a\s+(?:little|bit)\s+)?(?:on-?road\s+|ex-?showroom\s+|final\s+|listed\s+|quoted\s+)?price\b/i,
  /\b(?:bring(?:ing)?\s+(?:the\s+)?price\s+down|price\s+(?:can\s+)?(?:come\s+)?down)\b/i,
  /\b(?:better|best|special|lowest|cheaper|cheapest|exclusive|rock[\s-]?bottom|bargain)\s+(?:price|deal)s?\b/i,
  /\bnegotiable\b|\bnegotiate\s+(?:on\s+|the\s+|your\s+)*price\b/i,
  /\bcheaper\b/i,
  /\b(?:less|lower)\s+than\s+(?:the\s+)?(?:quoted|listed|official|showroom|ex-?showroom|on-?road|advertised)\s+price\b/i,
  /\bmatch(?:ing)?\s+(?:any|the|a)\s+(?:competitor|other\s+dealer|dealer)\S*\s*(?:price|quote|offer)\b/i,
  // the word itself with letters spread out or hyphenated: "d i s c o u n t", "dis-count"
  /\bd[\W_]{0,2}i[\W_]{0,2}s[\W_]{0,2}c[\W_]{0,2}o[\W_]{0,2}u[\W_]{0,2}n[\W_]{0,2}t/i,
];

export function findPriceConcessionPhrase(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = normalizeForCheck(text);
  if (!trimmed) return null;
  for (const pattern of PRICE_CONCESSION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export function containsForbiddenDiscountWords(text: string): boolean {
  return findForbiddenDiscountWord(text) !== null;
}
