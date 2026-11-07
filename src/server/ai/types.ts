/** Shared AI types. Kept free of server-only imports so tests and client-safe code can import them. */

/** One entry per AI-powered capability; written to ai_logs.feature and used for per-feature daily caps. */
export type AiFeature =
  | "chat"
  | "lead_summary"
  | "handoff_brief"
  | "lead_agent"
  | "digest"
  | "price_band_note";

/** fast = Haiku-class (chatbot, extraction, digests); smart = Sonnet-class (lead summaries, replies, agent). */
export type AiTier = "fast" | "smart";

/**
 * ok = model output used. fallback = rule-based path used (AI off, over the daily cap, timeout, error).
 * blocked = model output rejected by a guard. error = the model call itself failed.
 */
export type AiStatus = "ok" | "fallback" | "blocked" | "error";

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiLogEntry {
  feature: AiFeature;
  /** Legacy audit key in ai_logs.action, e.g. "copilot_generated" (the admin AI panel counts on it). */
  action: string;
  status: AiStatus;
  model?: string | null;
  userId?: string | null;
  leadId?: string | null;
  inputHash?: string | null;
  /** A short, redacted description of the input. Never raw buyer text, phone, email or registration numbers. */
  prompt?: string | null;
  response?: string | null;
  latencyMs?: number;
  usage?: AiUsage;
}
