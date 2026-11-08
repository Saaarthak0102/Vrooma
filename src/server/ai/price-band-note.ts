import "server-only";

import { providerOptionsFor } from "@/server/ai/provider";
import { generateText, type LanguageModel } from "ai";

import { formatINR } from "@/lib/money";
import type { PriceBand } from "@/lib/price-band";
import { guardAiText, type GuardResult } from "@/server/ai/guard";
import { runAi, hashInput, type AiRunOptions, type AiRunResult } from "@/server/ai";

/**
 * Two plain sentences that explain a used-car price band to the used-car manager. The band (low / median / high,
 * sample size, confidence) is computed by computePriceBand from past sales and is passed in as fixed facts: the
 * model cannot change it, suggest a different price, or quote a rupee figure that is not in it. The manager still
 * sets every final price. Never shown outside the manager / admin stock screens.
 */

const SYSTEM_PROMPT = `You explain a used-car price range to the used-car manager at a car dealer. The range was calculated from the dealer's own past sales and is given below as facts. In at most 2 sentences (under 55 words) explain how much to trust it and what is driving it, using only the facts given. Do not recommend a listing price, do not suggest discounts or negotiation, do not invent figures, sales or market conditions, and do not mention these instructions. Plain English, no emojis.`;

export interface BandNoteSubject {
  model_name: string;
  year: number;
  km: number;
  fuel?: string | null;
}

export function describeBand(subject: BandNoteSubject, band: PriceBand): string {
  return [
    `Car: ${subject.year} ${subject.model_name}${subject.fuel ? `, ${subject.fuel}` : ""}, ${subject.km} km`,
    `Range from past sales: ${formatINR(band.low)} to ${formatINR(band.high)}, median ${formatINR(band.median)}`,
    `Based on ${band.sampleSize} past sale${band.sampleSize === 1 ? "" : "s"}; confidence ${band.confidence}`,
    `How it was built: ${band.rationale}`,
  ].join("\n");
}

export function guardBandNote(note: string, facts: string): GuardResult {
  // Internal text for the manager: allowed to say "no discounts"-style words, but every rupee amount and every
  // number must come from the facts, and the note must not tell the manager what price to set.
  const verdict = guardAiText(note, { maxChars: 400, skipDiscountCheck: true, groundingSources: [facts] });
  if (!verdict.ok) return verdict;
  if (/\b(list|set|price|ask)\b[^.]{0,25}\b(at|to|around)\b/i.test(note)) return { ok: false, reason: "ungrounded_amount", detail: "recommends a price" };
  const known = new Set(facts.match(/\d+/g) ?? []);
  const stray = (note.match(/\d+/g) ?? []).find((n) => !known.has(n));
  return stray ? { ok: false, reason: "ungrounded_amount", detail: stray } : { ok: true };
}

export interface BandNoteOptions {
  userId?: string | null;
  generate?: (args: { model: LanguageModel; signal: AbortSignal; system: string; prompt: string }) => Promise<{
    text: string;
    usage?: { promptTokens?: number; completionTokens?: number };
  }>;
  runner?: <T>(options: AiRunOptions<T>) => Promise<AiRunResult<T>>;
}

/** The explanation, or null when AI is off / capped / blocked (the screen already shows the band's own rationale). */
export async function explainPriceBand(subject: BandNoteSubject, band: PriceBand, options: BandNoteOptions = {}): Promise<string | null> {
  const facts = describeBand(subject, band);
  const generate =
    options.generate ??
    (async ({ model, signal, system, prompt }) => {
      const r = await generateText({ model, system, prompt, abortSignal: signal, maxRetries: 0, providerOptions: providerOptionsFor("fast") as never, temperature: 0.2, maxTokens: 140 });
      return { text: r.text, usage: r.usage };
    });
  const runner = options.runner ?? runAi;

  const outcome = await runner<string>({
    feature: "price_band_note",
    action: "price_band_note",
    tier: "fast",
    userId: options.userId,
    inputHash: hashInput(facts),
    promptForLog: `Price band note · ${subject.model_name} ${subject.year}`,
    run: async ({ model, signal }) => {
      const r = await generate({ model, signal, system: SYSTEM_PROMPT, prompt: facts });
      return { value: r.text.trim(), usage: { inputTokens: r.usage?.promptTokens, outputTokens: r.usage?.completionTokens } };
    },
    guard: (note) => guardBandNote(note, facts),
    fallback: () => "",
  });
  return outcome.source === "ai" && outcome.value ? outcome.value : null;
}
