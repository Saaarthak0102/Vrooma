import "server-only";

import type { LanguageModel } from "ai";

import type { GuardResult } from "@/server/ai/guard";
import { isRateLimitError, retryAfterMs, type RateGate } from "@/server/ai/rate-gate";
import type { AiFeature, AiLogEntry, AiStatus, AiTier, AiUsage } from "@/server/ai/types";

/**
 * The single wrapper every AI feature goes through. It guarantees the same behaviour everywhere:
 *
 *   AI off / over the daily cap  -> rule-based fallback (no model call)
 *   model call times out or throws -> rule-based fallback, logged as error
 *   output rejected by a guard    -> rule-based fallback, logged as blocked (discount word, invented price, ...)
 *   otherwise                      -> model output, logged as ok with tokens and latency
 *
 * so no feature can leak an unguarded completion or depend on the LLM being reachable.
 */

export interface AiRunDeps {
  enabled(): boolean;
  resolveModel(tier: AiTier): { model: LanguageModel; id: string };
  timeoutMs(tier: AiTier): number;
  isOverCap(feature: AiFeature): Promise<boolean>;
  log(entry: AiLogEntry): Promise<void>;
  now(): number;
  /** Cooldown after a 429 and an optional per-minute ceiling. Omit to disable. */
  gate?: RateGate;
}

export interface AiRunOptions<T> {
  feature: AiFeature;
  /** ai_logs.action, e.g. "copilot_generated". */
  action: string;
  tier: AiTier;
  userId?: string | null;
  leadId?: string | null;
  inputHash?: string | null;
  /** Overrides the tier's default timeout, e.g. when a buyer is waiting on the result. */
  timeoutMs?: number;
  /** Redacted description of the input for the audit row. Never raw buyer text or contact details. */
  promptForLog?: string;
  /** Calls the model. Must honour `signal`. Return the typed value plus token usage. */
  run(ctx: { model: LanguageModel; modelId: string; signal: AbortSignal }): Promise<{
    value: T;
    usage?: AiUsage;
    /** Text stored in ai_logs.response. Defaults to JSON of the value. */
    responseText?: string;
  }>;
  /** Returns { ok: false } to reject the output. Runs on every model result before it is used. */
  guard?(value: T): GuardResult;
  /** The existing rule-based answer. Always available. */
  fallback(): T | Promise<T>;
}

export interface AiRunResult<T> {
  value: T;
  source: "ai" | "fallback";
  status: AiStatus;
  /** Why the fallback was used (disabled, over_cap, timeout, error, or the guard reason). */
  reason?: string;
}

function describe(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

export async function runWithFallback<T>(options: AiRunOptions<T>, deps: AiRunDeps): Promise<AiRunResult<T>> {
  const fallback = async (status: AiStatus, reason: string): Promise<AiRunResult<T>> => {
    return { value: await options.fallback(), source: "fallback", status, reason };
  };

  if (!deps.enabled()) return fallback("fallback", "disabled");

  if (await deps.isOverCap(options.feature)) {
    console.warn(`[ai] ${options.feature} is over its daily call cap; using the rule-based fallback`);
    return fallback("fallback", "over_cap");
  }

  const blockedBy = deps.gate?.check(deps.now());
  if (blockedBy) return fallback("fallback", blockedBy === "cooldown" ? "rate_limited" : "throttled");

  const { model, id: modelId } = deps.resolveModel(options.tier);
  const base: Omit<AiLogEntry, "status"> = {
    feature: options.feature,
    action: options.action,
    model: modelId,
    userId: options.userId,
    leadId: options.leadId,
    inputHash: options.inputHash,
    prompt: options.promptForLog,
  };

  const startedAt = deps.now();
  deps.gate?.record(startedAt);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? deps.timeoutMs(options.tier));

  try {
    const aborted = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => reject(new Error("ai_timeout")), { once: true });
    });
    const result = await Promise.race([options.run({ model, modelId, signal: controller.signal }), aborted]);
    const latencyMs = deps.now() - startedAt;
    const responseText = result.responseText ?? describe(result.value);

    const verdict = options.guard ? options.guard(result.value) : ({ ok: true } as GuardResult);
    if (!verdict.ok) {
      await deps.log({
        ...base,
        status: "blocked",
        response: `[blocked: ${verdict.reason}] ${responseText}`,
        latencyMs,
        usage: result.usage,
      });
      return fallback("blocked", verdict.reason ?? "guard");
    }

    await deps.log({ ...base, status: "ok", response: responseText, latencyMs, usage: result.usage });
    return { value: result.value, source: "ai", status: "ok" };
  } catch (err: any) {
    // The API said "too many requests": stop calling for a while. Logged as a fallback (not an error) so a quota
    // problem does not eat the daily cap.
    if (isRateLimitError(err)) {
      deps.gate?.tripped(deps.now(), retryAfterMs(err));
      console.warn(`[ai] ${options.feature}: the model API is rate limited; using the rule-based fallback for a while`);
      await deps.log({ ...base, status: "fallback", response: `[rate_limited] ${String(err?.message ?? err).slice(0, 240)}`, latencyMs: deps.now() - startedAt });
      return fallback("fallback", "rate_limited");
    }
    const timedOut = err?.message === "ai_timeout" || err?.name === "AbortError";
    await deps.log({
      ...base,
      status: "error",
      response: `[${timedOut ? "timeout" : "error"}] ${String(err?.message ?? err).slice(0, 300)}`,
      latencyMs: deps.now() - startedAt,
    });
    return fallback("error", timedOut ? "timeout" : "error");
  } finally {
    clearTimeout(timer);
  }
}
