/**
 * Protects a small API quota (free tiers allow only a handful of requests per minute).
 *
 *  - Cooldown: after the API answers 429 / RESOURCE_EXHAUSTED, no model call is made until the cooldown ends
 *    (the time the API asked for, else 60 s). Features use their rule-based answer meanwhile.
 *  - Ceiling: optionally at most `maxPerMinute` model calls in any rolling minute (0 = no ceiling).
 *  - Breaker: two failed calls in a row (timeout, "high demand", any error) pause model calls for 30 s, so an
 *    overloaded or broken model costs one slow request, not one for every buyer message. One success resets it.
 *
 * In-memory and per server instance: a best-effort guard, not a global limiter. The daily cap in budget.ts and the
 * API's own 429 remain the hard limits.
 */
export interface RateGate {
  /** null = go ahead, otherwise why not. */
  check(now: number): "cooldown" | "throttled" | null;
  /** Record that a model call is about to be made. */
  record(now: number): void;
  /** The API said "too many requests". */
  tripped(now: number, retryAfterMs?: number): void;
  /** A call failed for any other reason (timeout, overloaded, error). */
  failed(now: number): void;
  /** A call got an answer from the model. */
  succeeded(): void;
  /** Why the gate is closed, so the log can say rate limit or unavailable. */
  cause(): "rate_limit" | "unavailable" | null;
}

export const DEFAULT_COOLDOWN_MS = 60_000;
export const BREAKER_COOLDOWN_MS = 30_000;
export const BREAKER_FAILURES = 2;
const MAX_COOLDOWN_MS = 10 * 60_000;

export function createRateGate(maxPerMinute = 0): RateGate {
  let cooldownUntil = 0;
  let causeNow: "rate_limit" | "unavailable" | null = null;
  let failures = 0;
  let calls: number[] = [];
  return {
    check(now) {
      if (now < cooldownUntil) return "cooldown";
      if (maxPerMinute > 0) {
        calls = calls.filter((t) => now - t < 60_000);
        if (calls.length >= maxPerMinute) return "throttled";
      }
      return null;
    },
    record(now) {
      if (maxPerMinute > 0) calls.push(now);
    },
    tripped(now, retryAfterMs) {
      const wait = retryAfterMs && retryAfterMs > 0 ? Math.min(retryAfterMs, MAX_COOLDOWN_MS) : DEFAULT_COOLDOWN_MS;
      cooldownUntil = Math.max(cooldownUntil, now + wait);
      causeNow = "rate_limit";
      failures = 0;
    },
    failed(now) {
      failures += 1;
      if (failures >= BREAKER_FAILURES) {
        failures = 0;
        if (now + BREAKER_COOLDOWN_MS > cooldownUntil) {
          cooldownUntil = now + BREAKER_COOLDOWN_MS;
          causeNow = "unavailable";
        }
      }
    },
    succeeded() {
      failures = 0;
    },
    cause() {
      return causeNow;
    },
  };
}

/** 429 from the API, however the SDK words it. */
export function isRateLimitError(err: unknown): boolean {
  const e = err as { statusCode?: number; status?: number; message?: string; cause?: unknown; lastError?: unknown } | null;
  if (!e) return false;
  if (e.statusCode === 429 || e.status === 429) return true;
  if (/\b429\b|RESOURCE_EXHAUSTED|rate.?limit|quota|too many requests/i.test(String(e.message ?? ""))) return true;
  // The AI SDK wraps retries in a RetryError whose lastError holds the real one.
  return e.lastError ? isRateLimitError(e.lastError) : e.cause ? isRateLimitError(e.cause) : false;
}

/** Milliseconds the API asked us to wait (Retry-After header, or "retry in 12.3s" in the message), if any. */
export function retryAfterMs(err: unknown): number | undefined {
  const e = err as { responseHeaders?: Record<string, string>; message?: string; lastError?: unknown } | null;
  if (!e) return undefined;
  const header = e.responseHeaders?.["retry-after"];
  if (header && Number.isFinite(Number(header))) return Number(header) * 1000;
  const m = /retry (?:in|after) ([\d.]+)\s*s/i.exec(String(e.message ?? ""));
  if (m) return Math.ceil(Number(m[1]) * 1000);
  return e.lastError ? retryAfterMs(e.lastError) : undefined;
}
