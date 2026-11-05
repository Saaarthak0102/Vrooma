export const FORBIDDEN_DISCOUNT_WORDS = [
  "discount",
  "discounts",
  "price cut",
  "price cuts",
  "waiver",
  "waivers",
  "off",
  "cashback",
  "छूट",
  "कम",
];

export function containsForbiddenDiscountWords(text: string): boolean {
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN_DISCOUNT_WORDS) {
    if (word.startsWith("छ") || word.startsWith("क")) {
      if (lower.includes(word)) return true;
    } else {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(lower)) return true;
    }
  }
  return false;
}

