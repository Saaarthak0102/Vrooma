/**
 * scripts/ai-smoke.ts   (pnpm ai:smoke)
 *
 * First thing to run after putting an API key in .env.local. It does NOT start the app and does NOT touch the
 * database. For the configured provider (AI_PROVIDER, default google) it:
 *   1. lists the models the key can call and recommends a fast and a smart one (Gemini),
 *   2. runs, for each of the two models, the three kinds of call the app makes: plain text, structured output
 *      (what lead briefings use) and a tool call (what the chatbot and agent use),
 *   3. prints latency and token counts and exits non-zero if anything failed.
 *
 * The key is read from AI_PROVIDER_API_KEY and is never printed. Calls are tiny (about six requests in total), but a
 * free key has a small per-minute limit: if you see a rate-limit message, wait a minute and run it again.
 *
 * Usage:  pnpm ai:smoke            (uses AI_MODEL_FAST / AI_MODEL_SMART if set, else the recommendation)
 */

import fs from "node:fs";
import path from "node:path";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText, tool } from "ai";
import { z } from "zod";

export interface ListedModel {
  name: string;
  methods: string[];
}

/**
 * Picks the newest STABLE flash-lite (fast) and flash (smart) from a model list. Previews, experiments, image,
 * audio, live and embedding models are skipped, because they are not what a free key should depend on.
 * Pure, so it is unit tested.
 */
export function recommendModels(models: ListedModel[]): { fast: string | null; smart: string | null } {
  const usable = models
    .filter((m) => m.methods.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""));
  const newest = (pattern: RegExp): string | null => {
    const matches = usable
      .map((name) => ({ name, m: pattern.exec(name) }))
      .filter((x): x is { name: string; m: RegExpExecArray } => Boolean(x.m))
      .sort((a, b) => Number(b.m[1]) - Number(a.m[1]));
    return matches[0]?.name ?? null;
  };
  return {
    fast: newest(/^gemini-(\d+(?:\.\d+)?)-flash-lite$/),
    smart: newest(/^gemini-(\d+(?:\.\d+)?)-flash$/),
  };
}

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const ms = (t: number) => `${Math.round(t)} ms`;
const tok = (u?: { promptTokens?: number; completionTokens?: number }) => (u ? `${u.promptTokens ?? "?"} in / ${u.completionTokens ?? "?"} out tokens` : "tokens unknown");

function explain(err: any): string {
  const msg = String(err?.message ?? err);
  if (err?.statusCode === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return `RATE LIMITED (${msg.slice(0, 120)}). Wait a minute and run again, and check the limits on your key's usage page.`;
  }
  if (err?.statusCode === 400 || /API key|API_KEY_INVALID/i.test(msg)) return `REJECTED (${msg.slice(0, 160)}). Check the key and the model name.`;
  if (err?.statusCode === 404 || /not found|not supported/i.test(msg)) return `MODEL NOT AVAILABLE to this key (${msg.slice(0, 120)}). Pick another from the list above.`;
  return msg.slice(0, 220);
}

async function main() {
  loadEnv();
  const key = process.env.AI_PROVIDER_API_KEY;
  const provider = (process.env.AI_PROVIDER || "google").toLowerCase();
  console.log("=== VROOMA AI SMOKE TEST ===");
  if (!key) {
    console.error("\n❌ AI_PROVIDER_API_KEY is not set (put it in .env.local). Nothing to test.\n");
    process.exit(1);
  }
  if (provider !== "google" && provider !== "anthropic") {
    console.error(`\n❌ AI_PROVIDER must be google or anthropic (got '${provider}').\n`);
    process.exit(1);
  }
  console.log(`Provider: ${provider} (key present, not shown)\n`);

  let fast = process.env.AI_MODEL_FAST?.trim() || "";
  let smart = process.env.AI_MODEL_SMART?.trim() || "";

  if (provider === "google") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      console.error(`❌ Could not list models (HTTP ${res.status}). ${res.status === 400 || res.status === 403 ? "The key looks invalid or has no access." : ""}\n`);
      process.exit(1);
    }
    const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const models: ListedModel[] = (body.models ?? []).map((m) => ({ name: m.name, methods: m.supportedGenerationMethods ?? [] }));
    const callable = models.filter((m) => m.methods.includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
    console.log(`Models this key can call (${callable.length}):`);
    for (const name of callable.filter((n) => n.startsWith("gemini")).sort()) console.log(`  ${name}`);
    const rec = recommendModels(models);
    console.log(`\nRecommended: AI_MODEL_FAST=${rec.fast ?? "(none found)"}  AI_MODEL_SMART=${rec.smart ?? "(none found)"}\n`);
    fast ||= rec.fast ?? "gemini-2.5-flash-lite";
    smart ||= rec.smart ?? "gemini-2.5-flash";
  } else {
    fast ||= "claude-haiku-5-5";
    smart ||= "claude-sonnet-5-5";
  }

  const google = provider === "google" ? createGoogleGenerativeAI({ apiKey: key }) : null;
  const anthropic = provider === "anthropic" ? createAnthropic({ apiKey: key }) : null;
  const make = (id: string) => (google ? google(id) : anthropic!(id));

  let failures = 0;
  for (const [tier, id] of [["fast", fast], ["smart", smart]] as const) {
    console.log(`--- ${tier}: ${id}`);
    const model = make(id);
    const providerOptions = google && tier === "fast" ? ({ google: { thinkingConfig: { thinkingBudget: 0 } } } as never) : undefined;

    const check = async (label: string, run: () => Promise<{ ok: boolean; note: string; usage?: { promptTokens?: number; completionTokens?: number } }>) => {
      const t = performance.now();
      try {
        const r = await run();
        const line = `${r.ok ? "PASS" : "FAIL"}  ${label.padEnd(18)} ${ms(performance.now() - t).padStart(8)}  ${tok(r.usage)}  ${r.note}`;
        console.log(`  ${line}`);
        if (!r.ok) failures++;
      } catch (err) {
        console.log(`  FAIL  ${label.padEnd(18)} ${ms(performance.now() - t).padStart(8)}  ${explain(err)}`);
        failures++;
      }
    };

    await check("plain text", async () => {
      const r = await generateText({ model, prompt: "Reply with the single word OK.", maxRetries: 0, providerOptions, maxTokens: 20 });
      return { ok: /ok/i.test(r.text), note: JSON.stringify(r.text.slice(0, 40)), usage: r.usage };
    });

    await check("structured output", async () => {
      const r = await generateObject({
        model,
        maxRetries: 0,
        providerOptions,
        schema: z.object({
          summary: z.string().min(10).max(200),
          urgency: z.enum(["high", "medium", "low"]),
          budget: z.string().max(40).nullable(),
          finance: z.boolean().nullable(),
        }),
        prompt: "Summarise this car enquiry for a sales consultant: 'Looking for a petrol automatic under 14 lakh, will need a loan, want to drive one this week.'",
      });
      return { ok: ["high", "medium", "low"].includes(r.object.urgency), note: `urgency=${r.object.urgency} finance=${r.object.finance}`, usage: r.usage };
    });

    await check("tool call", async () => {
      const r = await generateText({
        model,
        maxRetries: 0,
        providerOptions,
        maxSteps: 3,
        tools: {
          get_price: tool({
            description: "Ex-showroom price of a Vrooma model.",
            parameters: z.object({ model: z.string().min(1), maxPrice: z.number().int().positive().optional() }),
            execute: async () => ({ model: "Model H", exShowroom: "₹12,45,000" }),
          }),
        },
        prompt: "What is the ex-showroom price of the Model H? Use the tool and answer in one sentence.",
      });
      const used = r.steps.some((s) => s.toolResults.length > 0);
      return { ok: used && /12,45,000|12\.45/.test(r.text), note: used ? `called the tool, answered: ${r.text.slice(0, 50)}` : "the model did not call the tool", usage: r.usage };
    });
  }

  console.log(failures === 0 ? "\n✅ All checks passed. Put the recommended model names in .env.local and restart the dev server.\n" : `\n❌ ${failures} check(s) failed. Fix those before turning the features on.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  const isDirectRun = typeof process.argv[1] === "string" && process.argv[1].endsWith("ai-smoke.ts");
  if (isDirectRun) {
    main().catch((err) => {
      console.error("Fatal error:", explain(err));
      process.exit(1);
    });
  }
}
