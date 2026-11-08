/**
 * scripts/ai-smoke.ts   (pnpm ai:smoke)
 *
 * First thing to run after putting an API key in .env.local. It does not start the app and does not touch the
 * database. It chooses the models by TRYING them, because the model list is not trustworthy: it contains models the
 * key cannot call (Gemini 2.5 is listed but retired for new keys), and the newest model is often overloaded.
 *
 *   1. lists the models the key can see,
 *   2. sends one tiny request to each candidate (flash and flash-lite models only; never pro, preview, image, tts,
 *      live or computer-use models) with a time limit, and records which answered and how fast,
 *   3. on the fastest working fast model and smart model, runs the three kinds of request the app makes: plain text,
 *      structured output (what lead briefings and the Next-steps agent use) and a chat-sized prompt with a facts
 *      block (what the chatbot uses),
 *   4. prints the two lines to put in .env.local.
 *
 * The key is read from AI_PROVIDER_API_KEY and is never printed. Requests are spaced out to stay under a free key's
 * per-minute limit, so a full run takes one to two minutes.
 *
 * Usage:  pnpm ai:smoke
 *         pnpm ai:smoke -- --models gemini-3.5-flash,gemini-3.1-flash-lite     (try exactly these)
 */

import fs from "node:fs";
import path from "node:path";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";

// ------------------------------------------------------------------------------------------------------------------
// Pure helpers (unit tested)
// ------------------------------------------------------------------------------------------------------------------

/** Tried in this order. Names are only candidates: each one is probed before it is recommended. */
export const FAST_CANDIDATES = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
export const SMART_CANDIDATES = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-flash-latest"];

/** Kinds of model a free key either cannot use or should not depend on. */
const EXCLUDED = /(pro|preview|exp|image|tts|live|computer|robotics|transcribe|omni|nano|banana|embedding|aqa|audio|customtools|argon)/i;

export function usableCandidate(name: string): boolean {
  return /^gemini-/.test(name) && !EXCLUDED.test(name);
}

/** The wanted names that the key lists, in the wanted order, minus excluded kinds. */
export function filterCandidates(listed: string[], wanted: string[]): string[] {
  const have = new Set(listed.map((n) => n.replace(/^models\//, "")));
  return wanted.filter((w) => have.has(w) && usableCandidate(w));
}

export interface Probe {
  model: string;
  ok: boolean;
  ms: number;
  note: string;
}

/** The fastest probe that passed among `pool` (falls back to the fastest passing probe overall). */
export function pickBest(probes: Probe[], pool: string[]): string | null {
  const passed = probes.filter((p) => p.ok).sort((a, b) => a.ms - b.ms);
  return passed.find((p) => pool.includes(p.model))?.model ?? passed[0]?.model ?? null;
}

// ------------------------------------------------------------------------------------------------------------------
// Runner
// ------------------------------------------------------------------------------------------------------------------

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PACE_MS = 4_000;
const TIMEOUT_MS = 30_000;
const PROBE_TIMEOUT_MS = 20_000;
const ms = (t: number) => `${Math.round(t)} ms`;
const tok = (u?: { promptTokens?: number; completionTokens?: number }) => (u ? `${u.promptTokens ?? "?"} in / ${u.completionTokens ?? "?"} out tokens` : "");

/** The API's own words, not a summary of them. */
function describeError(err: any): string {
  const msg = String(err?.message ?? err);
  let body = "";
  if (typeof err?.responseBody === "string") {
    try {
      const j = JSON.parse(err.responseBody);
      body = j?.error?.message ? ` | ${j.error.status ?? ""} ${j.error.message}` : ` | ${err.responseBody}`;
    } catch {
      body = ` | ${err.responseBody}`;
    }
  }
  const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError" || /aborted|timeout/i.test(msg);
  const hint = timedOut
    ? "NO ANSWER IN TIME (the model is probably overloaded right now)"
    : err?.statusCode === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(msg)
      ? "RATE LIMITED or no free quota for this model"
      : err?.statusCode === 404 || /no longer available|not found/i.test(msg)
        ? "NOT AVAILABLE to this key"
        : err?.statusCode === 503 || /high demand|overloaded|UNAVAILABLE/i.test(msg)
          ? "OVERLOADED right now"
          : err?.statusCode === 400
            ? "REJECTED by the API"
            : "FAILED";
  return `${hint}: ${msg}${body}`.replace(/\s+/g, " ").slice(0, 420);
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
  if (provider !== "google") {
    console.error(`\nThis tool probes Gemini models. For AI_PROVIDER=${provider} set AI_MODEL_FAST / AI_MODEL_SMART yourself.\n`);
    process.exit(1);
  }
  console.log("Provider: google (key present, not shown)\n");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`);
  if (!res.ok) {
    console.error(`❌ Could not list models (HTTP ${res.status}). ${res.status === 400 || res.status === 403 ? "The key looks invalid or has no access." : ""}\n`);
    process.exit(1);
  }
  const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const listed = (body.models ?? []).filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
  console.log(`The key can see ${listed.length} models. Being listed does not mean a model works; trying candidates now.\n`);

  const argIdx = process.argv.indexOf("--models");
  const forced = argIdx !== -1 ? (process.argv[argIdx + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : [];
  const fastPool = forced.length ? forced : filterCandidates(listed, FAST_CANDIDATES);
  const smartPool = forced.length ? forced : filterCandidates(listed, SMART_CANDIDATES);
  const candidates = [...new Set([...fastPool, ...smartPool])];
  if (!candidates.length) {
    console.error("❌ None of the candidate models is listed for this key. Run with --models name1,name2 to try specific ones.\n");
    process.exit(1);
  }

  const google = createGoogleGenerativeAI({ apiKey: key });
  const probes: Probe[] = [];
  console.log("--- Trying each candidate with one tiny request");
  for (const model of candidates) {
    const t = performance.now();
    try {
      const r = await generateText({ model: google(model), prompt: "Reply with the single word OK.", maxRetries: 0, maxTokens: 20, abortSignal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
      const ok = /ok/i.test(r.text);
      probes.push({ model, ok, ms: performance.now() - t, note: ok ? "answered" : `unexpected answer ${JSON.stringify(r.text.slice(0, 30))}` });
    } catch (err) {
      probes.push({ model, ok: false, ms: performance.now() - t, note: describeError(err) });
    }
    const p = probes[probes.length - 1];
    console.log(`  ${p.ok ? "PASS" : "FAIL"}  ${model.padEnd(28)} ${ms(p.ms).padStart(9)}  ${p.note}`);
    await sleep(PACE_MS);
  }

  const fast = pickBest(probes, fastPool);
  const smart = pickBest(probes, smartPool);
  if (!fast || !smart) {
    console.error("\n❌ No candidate answered. Check the quota for this key in AI Studio (Usage), then try again in a few minutes, or pass --models with other names.\n");
    process.exit(1);
  }
  console.log(`\nChosen: fast = ${fast}, smart = ${smart}\n`);

  let failures = 0;
  const factsBlock = [
    "NEW CARS (ex-showroom prices):",
    "- Model H, suv: ZX automatic (petrol, automatic) ₹12,45,000; VX (diesel, manual) ₹16,80,000. Page: /cars/model-h",
    "EMI FIGURES (9.5% is an assumed rate)",
    "- ₹10,00,000 over 60 months at 9.5%: ₹20,998 a month",
  ].join("\n");

  for (const [tier, id] of [["fast", fast], ["smart", smart]] as const) {
    console.log(`--- ${tier}: ${id}`);
    const model = google(id);
    const check = async (label: string, run: () => Promise<{ ok: boolean; note: string; usage?: { promptTokens?: number; completionTokens?: number } }>) => {
      const t = performance.now();
      try {
        const r = await run();
        console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${label.padEnd(20)} ${ms(performance.now() - t).padStart(9)}  ${tok(r.usage)}  ${r.note}`);
        if (!r.ok) failures++;
      } catch (err) {
        console.log(`  FAIL  ${label.padEnd(20)} ${ms(performance.now() - t).padStart(9)}  ${describeError(err)}`);
        failures++;
      }
      await sleep(PACE_MS);
    };

    await check("structured output", async () => {
      const r = await generateObject({
        model,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        // the same flat, nullable shape the Next-steps agent uses
        schema: z.object({
          proposals: z
            .array(
              z.object({
                kind: z.enum(["reply", "task", "escalate"]),
                reason: z.string().min(3).max(160),
                text: z.string().max(420).nullable(),
                title: z.string().max(100).nullable(),
                dueInHours: z.number().nullable(),
              }),
            )
            .max(3),
        }),
        prompt: "A new car enquiry arrived 2 minutes ago and nobody has called the buyer. Suggest up to 2 next steps for the sales consultant.",
      });
      return { ok: r.object.proposals.length > 0, note: `${r.object.proposals.length} suggestions: ${r.object.proposals.map((p) => p.kind).join(", ")}`, usage: r.usage };
    });

    await check("chat with facts", async () => {
      const r = await generateText({
        model,
        maxRetries: 0,
        maxTokens: 300,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        system: `You are Vrooma's website assistant. Use ONLY the FACTS below. Copy rupee amounts exactly. Under 60 words, plain text.\n\nFACTS:\n${factsBlock}`,
        messages: [{ role: "user", content: "What would the EMI be on a 10 lakh loan for 5 years, and what does the Model H ZX cost?" }],
      });
      const quoted = /20,998/.test(r.text) && /12,45,000/.test(r.text);
      return { ok: quoted, note: quoted ? `quoted the figures: ${r.text.replace(/\s+/g, " ").slice(0, 70)}` : `did not quote the facts: ${r.text.replace(/\s+/g, " ").slice(0, 90)}`, usage: r.usage };
    });
  }

  if (failures === 0) {
    console.log("\n✅ All checks passed. Put these two lines in .env.local and restart the dev server:\n");
    console.log(`AI_MODEL_FAST=${fast}`);
    console.log(`AI_MODEL_SMART=${smart}\n`);
  } else {
    console.log(`\n❌ ${failures} check(s) failed. Send me this output; do not turn the features on yet.\n`);
  }
  process.exit(failures === 0 ? 0 : 1);
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  const isDirectRun = typeof process.argv[1] === "string" && process.argv[1].endsWith("ai-smoke.ts");
  if (isDirectRun) {
    main().catch((err) => {
      console.error("Fatal error:", describeError(err));
      process.exit(1);
    });
  }
}
