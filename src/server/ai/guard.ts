import { findForbiddenDiscountWord } from "@/lib/validation/discount";

/**
 * Output and input guards shared by every AI feature. Pure functions, no I/O, so they are unit-tested directly
 * (tests/ai-guard.test.ts) and used identically by the chatbot, lead copilot and the Lead Desk Agent.
 *
 * Rules enforced here (from the brief and docs/AI.md):
 *  - no discounts, price cuts or waivers in anything a buyer or consultant could send (discount filter);
 *  - no full vehicle registration numbers (DPDP masking);
 *  - the model never invents a price: every rupee figure in a buyer-facing answer must come from a tool result
 *    (the price engine / EMI calculator / catalog), otherwise the caller falls back to the rule-based answer.
 */

export type GuardReason =
  | "empty"
  | "too_long"
  | "discount"
  | "registration_number"
  | "ungrounded_amount"
  | "disallowed_link";

export interface GuardResult {
  ok: boolean;
  reason?: GuardReason;
  detail?: string;
}

export interface GuardOptions {
  /** Hard cap on characters (buyer chat bubbles, SMS-length drafts). */
  maxChars?: number;
  /**
   * Facts the answer is allowed to quote. `undefined` skips the amount check entirely; `[]` means the text must
   * not contain any rupee amount (first-reply drafts); otherwise every amount must appear in these values.
   */
  groundingSources?: unknown[];
  /**
   * Internal, staff-only text (lead summaries, suggested actions) may describe what the buyer asked for, including
   * "asked for a discount". Never set this for anything that can reach a buyer or be sent as a reply.
   */
  skipDiscountCheck?: boolean;
  /** Buyer-facing text: only links to our own pages (SITE_PATHS) are allowed; any URL or other path is rejected. */
  checkLinks?: boolean;
}

/** Site sections the assistant may point buyers to. Anything else it writes as a link is treated as invented. */
export const SITE_PATH_PREFIXES = [
  "/cars",
  "/used-cars",
  "/book/test-drive",
  "/book/service",
  "/emi-calculator",
  "/trade-in",
  "/offers",
  "/showrooms",
  "/contact",
  "/dashboard",
  "/legal",
] as const;

/** First link in the text that is not an allowed site page, or null. */
export function findDisallowedLink(text: string): string | null {
  const external = /(?:https?:\/\/|www\.)\S+/i.exec(text);
  if (external) return external[0];
  for (const m of text.matchAll(/(?<![\w/.])(\/[a-z][a-z0-9\-/]*)/gi)) {
    const path = m[1].replace(/\/+$/, "");
    const ok = SITE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    if (!ok) return m[1];
  }
  return null;
}

/** Indian registration number (state, RTO, series, four digits). Upper-case on purpose: masked forms have `*`. */
const REGISTRATION_RE = /\b[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{1,3}[ -]?\d{4}\b/;

export function containsRegistrationNumber(text: string): boolean {
  return REGISTRATION_RE.test(text);
}

const UNIT_MULTIPLIER: Record<string, number> = {
  k: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  lacs: 100_000,
  crore: 10_000_000,
  crores: 10_000_000,
  cr: 10_000_000,
};

export interface ExtractedAmount {
  raw: string;
  rupees: number;
  /** True when written with a unit ("12.5 lakh"): rounded by nature, so matched with a small tolerance. */
  approximate: boolean;
}

const CURRENCY_RE = /(?:₹|\bRs\.?|\bINR)\s?(\d[\d,]*(?:\.\d+)?)\s?(lakhs?|lacs?|crores?|cr|k)?\b/gi;
const UNIT_ONLY_RE = /(?<![\w₹.])(\d[\d,]*(?:\.\d+)?)\s?(lakhs?|lacs?|crores?)\b/gi;

function toRupees(numberText: string, unit: string | undefined): ExtractedAmount | null {
  const value = Number(numberText.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const multiplier = unit ? UNIT_MULTIPLIER[unit.toLowerCase()] ?? 1 : 1;
  return { raw: "", rupees: value * multiplier, approximate: Boolean(unit) };
}

/** Every rupee amount written in the text: "₹12,45,000", "Rs 8.5 lakh", "12.45 Lakh", "₹18k". */
export function extractAmounts(text: string): ExtractedAmount[] {
  const found: ExtractedAmount[] = [];
  const seen = new Set<number>();

  const push = (match: RegExpMatchArray) => {
    const amount = toRupees(match[1], match[2]);
    if (!amount) return;
    // The unit-only pattern also matches inside a currency match; keep each span once.
    const key = match.index ?? -1;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ ...amount, raw: match[0].trim() });
  };

  for (const m of text.matchAll(CURRENCY_RE)) push(m);
  for (const m of text.matchAll(UNIT_ONLY_RE)) {
    // Skip spans already counted as part of a currency match (they start earlier, at the currency symbol).
    const start = m.index ?? 0;
    const covered = found.some((f) => {
      const at = text.indexOf(f.raw);
      return at !== -1 && start >= at && start < at + f.raw.length;
    });
    if (!covered) push(m);
  }
  return found;
}

/** Every number that appears in tool results / facts, including numbers written inside strings ("₹12,45,000"). */
export function collectNumbers(value: unknown, into: number[] = []): number[] {
  if (value === null || value === undefined) return into;
  if (typeof value === "number") {
    if (Number.isFinite(value)) into.push(Math.abs(value));
  } else if (typeof value === "string") {
    for (const amount of extractAmounts(value)) into.push(amount.rupees);
    for (const token of value.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
      const n = Number(token[0].replace(/,/g, ""));
      if (Number.isFinite(n)) into.push(n);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, into);
  } else if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectNumbers(item, into);
  }
  return into;
}

const UNIT_TOLERANCE = 0.006; // "12.5 lakh" quoted for ₹12,45,000 is 0.4% off; "12 lakh" is not accepted.

/** Amounts in `text` that no source value backs up. Empty array means the text is grounded. */
export function findUngroundedAmounts(text: string, sources: unknown[]): ExtractedAmount[] {
  const amounts = extractAmounts(text);
  if (amounts.length === 0) return [];
  const pool = collectNumbers(sources);
  return amounts.filter((amount) => {
    return !pool.some((n) => {
      if (Math.abs(n - amount.rupees) < 1) return true;
      if (!amount.approximate) return false;
      return Math.abs(n - amount.rupees) / amount.rupees <= UNIT_TOLERANCE;
    });
  });
}

export function guardAiText(text: string, options: GuardOptions = {}): GuardResult {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (options.maxChars && trimmed.length > options.maxChars) return { ok: false, reason: "too_long" };

  const forbidden = options.skipDiscountCheck ? null : findForbiddenDiscountWord(trimmed);
  if (forbidden) return { ok: false, reason: "discount", detail: forbidden };

  if (containsRegistrationNumber(trimmed)) return { ok: false, reason: "registration_number" };

  if (options.checkLinks) {
    const link = findDisallowedLink(trimmed);
    if (link) return { ok: false, reason: "disallowed_link", detail: link };
  }

  if (options.groundingSources !== undefined) {
    const ungrounded = findUngroundedAmounts(trimmed, options.groundingSources);
    if (ungrounded.length > 0) {
      return { ok: false, reason: "ungrounded_amount", detail: ungrounded.map((a) => a.raw).join(", ") };
    }
  }
  return { ok: true };
}

// --- Input side -----------------------------------------------------------------------------------------------

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\b[^.\n]{0,30}\b(previous|above|prior|earlier|all|your)\b[^.\n]{0,30}\b(instruction|prompt|rule|message)s?\b/i,
  /\bdisregard\b[^.\n]{0,30}\b(instruction|prompt|rule)s?\b/i,
  /\b(reveal|show|print|repeat|leak)\b[^.\n]{0,30}\b(system|hidden|initial|developer)\b[^.\n]{0,20}\b(prompt|instruction|message)s?\b/i,
  /\b(system|developer)\s+prompt\b/i,
  /\byou\s+are\s+now\b/i,
  /\b(act|behave|respond)\s+as\s+(if\s+you\s+(are|were)\s+)?(an?\s+)?(unrestricted|jailbroken|dan)\b/i,
  /\b(jailbreak|developer\s+mode|dan\s+mode)\b/i,
  /<\s*\/?\s*(system|assistant|tool|instructions?)\s*>/i,
];

/** Heuristic prompt-injection check. A hit skips the model and uses the rule-based fallback answer. */
export function looksLikePromptInjection(text: string): boolean {
  const normalised = (text ?? "").normalize("NFKC");
  return INJECTION_PATTERNS.some((pattern) => pattern.test(normalised));
}

// Built from a string so no raw separator characters (U+2028 etc.) ever sit inside a regex literal.
const CONTROL_CHARS_RE = new RegExp(
  "[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028-\u202E\u2066-\u2069]",
  "g",
);

/** Strips control characters and collapses whitespace; caps the length. Never trusts the caller's length checks. */
export function sanitizeUserText(text: string, maxChars = 1000): string {
  return (text ?? "")
    .normalize("NFKC")
    .replace(CONTROL_CHARS_RE, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}

/**
 * Wraps untrusted text so the model treats it as data. The tag name is also stripped from the text itself, so a
 * buyer cannot close the wrapper early and smuggle instructions after it.
 */
export function wrapUntrusted(text: string, label = "user_message"): string {
  const safe = sanitizeUserText(text, 4000).replace(new RegExp(`<\\s*/?\\s*${label}\\s*>`, "gi"), "");
  return `<${label}>\n${safe}\n</${label}>`;
}
