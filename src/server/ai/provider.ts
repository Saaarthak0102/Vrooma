import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import { env } from "@/lib/env";
import type { AiTier } from "@/server/ai/types";

/**
 * The only place that knows which LLM vendor and model ids are in use.
 *
 * AI is optional everywhere: with no AI_PROVIDER_API_KEY every feature takes its rule-based path, so the site,
 * chat and lead desk keep working. Automated tests never reach the network unless AI_LIVE_TEST=1 is set.
 *
 * AI_PROVIDER picks the vendor: "google" (Gemini, works with a free AI Studio key) or "anthropic" (Claude).
 * Everything else (guards, audit log, fallbacks, prompts) is vendor-neutral, so switching is an env change.
 */

export type AiProvider = "google" | "anthropic";

/**
 * Used when AI_MODEL_FAST / AI_MODEL_SMART are not set. Model names and free-tier access change over time, so run
 * `pnpm ai:smoke`: it lists what your key can call and recommends a pair to put in the env.
 */
export const DEFAULT_MODELS: Record<AiProvider, Record<AiTier, string>> = {
  google: { fast: "gemini-2.5-flash-lite", smart: "gemini-2.5-flash" },
  anthropic: { fast: "claude-haiku-5-5", smart: "claude-sonnet-5-5" },
};

/** Pure, so the choice is unit tested without touching the environment. */
export function pickModelId(provider: AiProvider, tier: AiTier, overrides: { fast?: string; smart?: string } = {}): string {
  const override = (tier === "fast" ? overrides.fast : overrides.smart)?.trim();
  return override || DEFAULT_MODELS[provider][tier];
}

export function aiEnabled(): boolean {
  if (!env.AI_PROVIDER_API_KEY) return false;
  if (process.env.VITEST && process.env.AI_LIVE_TEST !== "1") return false;
  return true;
}

export function modelIdFor(tier: AiTier): string {
  return pickModelId(env.AI_PROVIDER, tier, { fast: env.AI_MODEL_FAST, smart: env.AI_MODEL_SMART });
}

let google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let anthropic: ReturnType<typeof createAnthropic> | null = null;

export function resolveModel(tier: AiTier): { model: LanguageModel; id: string } {
  const id = modelIdFor(tier);
  if (env.AI_PROVIDER === "anthropic") {
    anthropic ??= createAnthropic({ apiKey: env.AI_PROVIDER_API_KEY });
    return { model: anthropic(id), id };
  }
  google ??= createGoogleGenerativeAI({ apiKey: env.AI_PROVIDER_API_KEY });
  return { model: google(id), id };
}

/**
 * Per-call extras for generateText / generateObject. On Gemini the fast tier turns "thinking" off: it adds seconds
 * of latency and counts against the quota, and these tasks (short answers, summaries, extraction) do not need it.
 */
export function providerOptionsFor(tier: AiTier): Record<string, Record<string, unknown>> | undefined {
  if (env.AI_PROVIDER === "google" && tier === "fast") {
    return { google: { thinkingConfig: { thinkingBudget: 0 } } };
  }
  return undefined;
}

/** Per-call wall-clock budget. Buyer chat must feel instant; staff features can wait a little longer. */
export const AI_TIMEOUT_MS: Record<AiTier, number> = { fast: env.AI_TIMEOUT_FAST_MS, smart: env.AI_TIMEOUT_SMART_MS };
