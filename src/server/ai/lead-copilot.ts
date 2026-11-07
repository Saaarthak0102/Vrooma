import "server-only";

import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

import { guardAiText, type GuardResult } from "@/server/ai/guard";
import { runAi, hashInput, type AiRunOptions, type AiRunResult } from "@/server/ai";
import {
  buildLeadPrompt,
  leadFingerprint,
  ruleBasedCopilot,
  type CopilotGenerationResult,
  type LeadAiInput,
} from "@/server/ai/lead-context";
import { buildLeadCopilotSystemPrompt } from "@/server/ai/prompts/lead-reply";

export type { CopilotGenerationResult, LeadAiInput, LeadAiProfile } from "@/server/ai/lead-context";

/** What the model must return. Validated by the AI SDK; anything else counts as a model failure -> fallback. */
export const LeadCopilotOutputSchema = z.object({
  summary: z.string().min(10).max(450),
  interest: z.string().min(1).max(120),
  urgency: z.enum(["high", "medium", "low"]),
  qualification: z.object({
    budget: z.string().max(80).nullable(),
    timeline: z.string().max(80).nullable(),
    fuel: z.string().max(40).nullable(),
    finance: z.boolean().nullable(),
    trade_in: z.boolean().nullable(),
  }),
  suggestedAction: z.string().min(3).max(160),
  draftReply: z.string().min(10).max(420),
});
export type LeadCopilotOutput = z.infer<typeof LeadCopilotOutputSchema>;

const MAX_DRAFT_WORDS = 80; // the prompt asks for 60; a little slack avoids discarding good drafts

/**
 * The draft is the only field that can reach a buyer, so it gets the strict checks (no discount language, no
 * rupee amount at all, no registration number). The other fields are for staff: they may say "asked about a
 * discount", but may not state a price the buyer never mentioned or leak a registration number.
 */
export function guardCopilotOutput(output: LeadCopilotOutput, input: LeadAiInput): GuardResult {
  const draft = guardAiText(output.draftReply, { maxChars: 420, groundingSources: [] });
  if (!draft.ok) return { ...draft, detail: `draftReply: ${draft.detail ?? draft.reason}` };
  if (output.draftReply.trim().split(/\s+/).length > MAX_DRAFT_WORDS) return { ok: false, reason: "too_long", detail: "draftReply" };

  const buyerFacts = [input.message, ...input.chat.map((c) => c.text), ...input.events.map((e) => e.note)];
  for (const field of [output.summary, output.suggestedAction, output.interest, output.qualification.budget ?? "x"]) {
    const verdict = guardAiText(field, { skipDiscountCheck: true, groundingSources: buyerFacts });
    if (!verdict.ok) return { ...verdict, detail: `staff field: ${verdict.detail ?? verdict.reason}` };
  }
  return { ok: true };
}

export interface GenerateArgs {
  model: LanguageModel;
  signal: AbortSignal;
  system: string;
  prompt: string;
}

type GenerateFn = (args: GenerateArgs) => Promise<{
  object: LeadCopilotOutput;
  usage?: { promptTokens?: number; completionTokens?: number };
}>;

const defaultGenerate: GenerateFn = async ({ model, signal, system, prompt }) => {
  const result = await generateObject({
    model,
    schema: LeadCopilotOutputSchema,
    system,
    prompt,
    abortSignal: signal,
    temperature: 0.3,
    maxTokens: 700,
  });
  return { object: result.object, usage: result.usage };
};

export interface GenerateLeadCopilotOptions {
  userId?: string | null;
  leadId?: string | null;
  /** Test seams: swap the model call and the runner. */
  generate?: GenerateFn;
  runner?: <T>(options: AiRunOptions<T>) => Promise<AiRunResult<T>>;
  now?: Date;
}

export interface LeadCopilotOutcome {
  result: CopilotGenerationResult;
  inputHash: string;
  source: "ai" | "fallback";
  /** Why the rule-based path was used, when it was. */
  reason?: string;
  modelFallbackLogged: boolean;
}

/**
 * Builds the buyer summary, profile and first-reply draft for a lead. Uses the model when AI is enabled and within
 * its limits; otherwise (or if the model fails, times out or breaks a guard) the rule-based version of the same
 * result. The caller never has to care which one it got.
 */
export async function generateLeadCopilot(
  input: LeadAiInput,
  options: GenerateLeadCopilotOptions = {},
): Promise<LeadCopilotOutcome> {
  const inputHash = hashInput(leadFingerprint(input));
  const generate = options.generate ?? defaultGenerate;
  const runner = options.runner ?? runAi;

  // The guard needs the model's raw structured output (not the mapped result); each call has its own closure.
  let raw: LeadCopilotOutput | null = null;

  const outcome = await runner<CopilotGenerationResult>({
    feature: "lead_summary",
    action: "copilot_generated",
    tier: "smart",
    userId: options.userId,
    leadId: options.leadId,
    inputHash,
    promptForLog: `Lead ${input.ref ?? "?"} · ${input.modelName || "general enquiry"} · source ${input.source}`,
    run: async ({ model, signal }) => {
      const { object, usage } = await generate({
        model,
        signal,
        system: buildLeadCopilotSystemPrompt(),
        prompt: buildLeadPrompt(input, options.now),
      });
      const value: CopilotGenerationResult = {
        summary: object.summary.trim(),
        draftReply: object.draftReply.trim(),
        suggestedAction: object.suggestedAction.trim(),
        profile: {
          interest: object.interest.trim(),
          urgency: object.urgency,
          qualification: object.qualification,
          suggestedAction: object.suggestedAction.trim(),
          origin: "ai",
        },
      };
      raw = object;
      return {
        value,
        usage: { inputTokens: usage?.promptTokens, outputTokens: usage?.completionTokens },
        responseText: object.draftReply,
      };
    },
    guard: () => (raw ? guardCopilotOutput(raw, input) : { ok: false, reason: "empty" }),
    fallback: () => ruleBasedCopilot(input),
  });

  return {
    result: outcome.value,
    inputHash,
    source: outcome.source,
    reason: outcome.reason,
    // The runner only writes an audit row when it actually called the model.
    modelFallbackLogged: outcome.reason !== "disabled" && outcome.reason !== "over_cap",
  };
}
