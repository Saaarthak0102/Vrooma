import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AiLogEntry } from "@/server/ai/types";

const MAX_TEXT = 4000;

/** SHA-256 of the model input, so identical inputs are recognised without storing the text twice. */
export function hashInput(...parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/**
 * Writes one ai_logs row (service role; RLS lets only managers read). Never throws: auditing must not break the
 * feature it audits.
 */
export async function logAiCall(entry: AiLogEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("ai_logs").insert({
      feature: entry.feature,
      action: entry.action,
      status: entry.status,
      model: entry.model ?? null,
      user_id: entry.userId ?? null,
      lead_id: entry.leadId ?? null,
      input_hash: entry.inputHash ?? null,
      prompt: entry.prompt ? entry.prompt.slice(0, MAX_TEXT) : null,
      response: entry.response ? entry.response.slice(0, MAX_TEXT) : null,
      latency_ms: entry.latencyMs ?? null,
      input_tokens: entry.usage?.inputTokens ?? null,
      output_tokens: entry.usage?.outputTokens ?? null,
    });
    if (error) console.warn(`[ai-log] insert failed (${entry.feature}/${entry.action}): ${error.message}`);
  } catch (err: any) {
    console.warn(`[ai-log] skipped (${entry.feature}/${entry.action}): ${err?.message}`);
  }
}
