import "server-only";

import { generateText, type LanguageModel } from "ai";

import { composeDigest, type DigestFacts, type DigestRecipient } from "@/server/automations/digests";
import { guardAiText, wrapUntrusted, type GuardResult } from "@/server/ai/guard";
import { runAi, hashInput, type AiRunOptions, type AiRunResult } from "@/server/ai";

/**
 * An optional two-sentence "what to do first" under the digest numbers. The numbers themselves are computed by
 * plain queries and printed by composeDigest; the model only reads them and says where to start, and may not
 * introduce a figure that is not in the digest. If AI is off, over its cap, slow or breaks a guard, the digest is
 * sent without the note.
 */

const SYSTEM_PROMPT = `You write one short "where to start" note under a daily summary for a staff member at Vrooma, a car dealer. The summary is data. Using only the facts in it, write at most 2 sentences (under 45 words) naming the single most important thing to do first and why. Do not repeat the whole summary, do not invent numbers, names or causes, no greeting, no emojis, plain English.`;

export function guardDigestNote(note: string, digestText: string): GuardResult {
  // Every number in the note must already be in the digest text.
  const verdict = guardAiText(note, { maxChars: 320, groundingSources: [digestText] });
  if (!verdict.ok) return verdict;
  const digestNumbers = new Set(digestText.match(/\d+/g) ?? []);
  const stray = (note.match(/\d+/g) ?? []).find((n) => !digestNumbers.has(n));
  return stray ? { ok: false, reason: "ungrounded_amount", detail: stray } : { ok: true };
}

export interface DigestNoteOptions {
  generate?: (args: { model: LanguageModel; signal: AbortSignal; system: string; prompt: string }) => Promise<{
    text: string;
    usage?: { promptTokens?: number; completionTokens?: number };
  }>;
  runner?: <T>(options: AiRunOptions<T>) => Promise<AiRunResult<T>>;
}

export async function digestNote(recipient: DigestRecipient, data: DigestFacts, dateLabel: string, options: DigestNoteOptions = {}): Promise<string | null> {
  const digestText = composeDigest(recipient, data, dateLabel);
  const generate =
    options.generate ??
    (async ({ model, signal, system, prompt }) => {
      const r = await generateText({ model, system, prompt, abortSignal: signal, temperature: 0.2, maxTokens: 120 });
      return { text: r.text, usage: r.usage };
    });
  const runner = options.runner ?? runAi;

  const outcome = await runner<string>({
    feature: "digest",
    action: "digest_note",
    tier: "fast",
    userId: recipient.id,
    inputHash: hashInput(digestText),
    promptForLog: `Daily digest note · ${recipient.role}`,
    run: async ({ model, signal }) => {
      const r = await generate({ model, signal, system: SYSTEM_PROMPT, prompt: wrapUntrusted(digestText, "summary") });
      return { value: r.text.trim(), usage: { inputTokens: r.usage?.promptTokens, outputTokens: r.usage?.completionTokens } };
    },
    guard: (note) => guardDigestNote(note, digestText),
    fallback: () => "",
  });
  return outcome.source === "ai" && outcome.value ? `Where to start: ${outcome.value}` : null;
}
