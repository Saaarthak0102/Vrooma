import "server-only";

import { isOverDailyCap } from "@/server/ai/budget";
import { logAiCall } from "@/server/ai/log";
import { env } from "@/lib/env";
import { AI_TIMEOUT_MS, aiEnabled, resolveModel } from "@/server/ai/provider";
import { createRateGate } from "@/server/ai/rate-gate";
import { runWithFallback, type AiRunDeps, type AiRunOptions, type AiRunResult } from "@/server/ai/runner";

export { hashInput } from "@/server/ai/log";
export {
  guardAiText,
  looksLikePromptInjection,
  sanitizeUserText,
  wrapUntrusted,
  type GuardOptions,
  type GuardResult,
} from "@/server/ai/guard";
export type { AiFeature, AiTier } from "@/server/ai/types";
export type { AiRunOptions, AiRunResult } from "@/server/ai/runner";

const defaultDeps: AiRunDeps = {
  enabled: aiEnabled,
  resolveModel,
  timeoutMs: (tier) => AI_TIMEOUT_MS[tier],
  isOverCap: (feature) => isOverDailyCap(feature),
  log: logAiCall,
  now: () => Date.now(),
  gate: createRateGate(env.AI_MAX_RPM),
};

/** Run an AI feature with the standard cap, timeout, guard, audit log and rule-based fallback. */
export function runAi<T>(options: AiRunOptions<T>): Promise<AiRunResult<T>> {
  return runWithFallback(options, defaultDeps);
}
