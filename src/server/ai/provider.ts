import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

import { env } from "@/lib/env";
import type { AiTier } from "@/server/ai/types";

/**
 * The only place that knows which LLM vendor and model ids are in use.
 *
 * AI is optional everywhere: with no AI_PROVIDER_API_KEY every feature takes its rule-based path, so the site,
 * chat and lead desk keep working. Automated tests never reach the network unless AI_LIVE_TEST=1 is set.
 */

let client: ReturnType<typeof createAnthropic> | null = null;

export function aiEnabled(): boolean {
  if (!env.AI_PROVIDER_API_KEY) return false;
  if (process.env.VITEST && process.env.AI_LIVE_TEST !== "1") return false;
  return true;
}

export function modelIdFor(tier: AiTier): string {
  return tier === "fast" ? env.AI_MODEL_FAST : env.AI_MODEL_SMART;
}

export function resolveModel(tier: AiTier): { model: LanguageModel; id: string } {
  client ??= createAnthropic({ apiKey: env.AI_PROVIDER_API_KEY });
  const id = modelIdFor(tier);
  return { model: client(id), id };
}

/** Per-call wall-clock budget. Buyer chat must feel instant; staff features can wait a little longer. */
export const AI_TIMEOUT_MS: Record<AiTier, number> = { fast: 8_000, smart: 20_000 };
