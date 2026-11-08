import { describe, expect, it } from "vitest";

import { DEFAULT_MODELS, aiEnabled, pickModelId, thinkingOptionsFor } from "@/server/ai/provider";
import { BREAKER_COOLDOWN_MS, createRateGate, isRateLimitError, retryAfterMs, DEFAULT_COOLDOWN_MS } from "@/server/ai/rate-gate";
import { redactPii, sanitizeUserText } from "@/server/ai/guard";
import { buildLeadPrompt, type LeadAiInput } from "@/server/ai/lead-context";
import { runWithFallback, type AiRunDeps, type AiRunOptions } from "@/server/ai/runner";
import type { AiLogEntry } from "@/server/ai/types";

describe("provider and model choice", () => {
  it("defaults to Gemini models and lets the env override either tier", () => {
    expect(pickModelId("google", "fast")).toBe(DEFAULT_MODELS.google.fast);
    expect(pickModelId("google", "smart")).toBe(DEFAULT_MODELS.google.smart);
    expect(DEFAULT_MODELS.google.fast).toMatch(/^gemini-/);
    expect(pickModelId("google", "fast", { fast: "  gemini-custom  " })).toBe("gemini-custom");
    expect(pickModelId("google", "smart", { fast: "x" })).toBe(DEFAULT_MODELS.google.smart);
    expect(pickModelId("google", "fast", { fast: "   " })).toBe(DEFAULT_MODELS.google.fast);
  });

  it("still supports Claude by switching the provider alone", () => {
    expect(pickModelId("anthropic", "fast")).toMatch(/^claude-/);
    expect(pickModelId("anthropic", "smart")).toMatch(/^claude-/);
  });

  it("never reaches the network from tests, whatever key is in the environment", () => {
    expect(aiEnabled()).toBe(false);
  });
});

describe("rate gate", () => {
  it("lets calls through, then blocks everything for the cooldown after a 429, then recovers", () => {
    const gate = createRateGate();
    expect(gate.check(1_000)).toBeNull();
    gate.tripped(1_000);
    expect(gate.check(1_000 + DEFAULT_COOLDOWN_MS - 1)).toBe("cooldown");
    expect(gate.check(1_000 + DEFAULT_COOLDOWN_MS)).toBeNull();
  });

  it("honours the wait the API asked for, within a sane maximum", () => {
    const gate = createRateGate();
    gate.tripped(0, 5_000);
    expect(gate.check(4_999)).toBe("cooldown");
    expect(gate.check(5_000)).toBeNull();
    gate.tripped(10_000, 99 * 60_000);
    expect(gate.check(10_000 + 10 * 60_000 - 1)).toBe("cooldown");
    expect(gate.check(10_000 + 10 * 60_000)).toBeNull();
  });

  it("caps calls per rolling minute when a ceiling is set, and has no ceiling by default", () => {
    const gate = createRateGate(3);
    for (let i = 0; i < 3; i++) {
      expect(gate.check(i * 1000)).toBeNull();
      gate.record(i * 1000);
    }
    expect(gate.check(3_000)).toBe("throttled");
    expect(gate.check(60_001)).toBeNull(); // the first call has aged out of the window

    const open = createRateGate();
    for (let i = 0; i < 100; i++) {
      open.record(i);
      expect(open.check(i)).toBeNull();
    }
  });

  it("recognises a 429 however the SDK words it", () => {
    expect(isRateLimitError({ statusCode: 429 })).toBe(true);
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError(new Error("RESOURCE_EXHAUSTED: Quota exceeded for metric"))).toBe(true);
    expect(isRateLimitError(new Error("You exceeded your current quota"))).toBe(true);
    expect(isRateLimitError({ message: "Failed after 3 attempts", lastError: { statusCode: 429 } })).toBe(true);
    expect(isRateLimitError(new Error("boom"))).toBe(false);
    expect(isRateLimitError({ statusCode: 500 })).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
  });

  it("reads the retry time from a header or from the message", () => {
    expect(retryAfterMs({ responseHeaders: { "retry-after": "12" } })).toBe(12_000);
    expect(retryAfterMs(new Error("Please retry in 7.2s."))).toBe(7_200);
    expect(retryAfterMs({ lastError: { responseHeaders: { "retry-after": "3" } } })).toBe(3_000);
    expect(retryAfterMs(new Error("nothing here"))).toBeUndefined();
  });
});

describe("runner on a rate-limited key", () => {
  function setup() {
    const logs: AiLogEntry[] = [];
    let clock = 1_000_000;
    const deps: AiRunDeps = {
      enabled: () => true,
      resolveModel: () => ({ model: {} as never, id: "gemini-test" }),
      timeoutMs: () => 500,
      isOverCap: async () => false,
      log: async (e) => void logs.push(e),
      now: () => clock,
      gate: createRateGate(),
    };
    const opts = (run: AiRunOptions<string>["run"]): AiRunOptions<string> => ({
      feature: "chat",
      action: "chat_answered",
      tier: "fast",
      run,
      fallback: () => "rule-based answer",
    });
    return { deps, logs, opts, advance: (ms: number) => void (clock += ms) };
  }

  it("falls back on a 429, then skips the model entirely during the cooldown, then recovers", async () => {
    const { deps, logs, opts, advance } = setup();
    let calls = 0;
    const throwing = async () => {
      calls++;
      throw Object.assign(new Error("429 RESOURCE_EXHAUSTED"), { statusCode: 429 });
    };

    const first = await runWithFallback(opts(throwing), deps);
    expect(first).toMatchObject({ source: "fallback", reason: "rate_limited", value: "rule-based answer" });
    expect(calls).toBe(1);

    const second = await runWithFallback(opts(throwing), deps);
    expect(second).toMatchObject({ source: "fallback", reason: "rate_limited" });
    expect(calls).toBe(1); // no second request while cooling down

    advance(DEFAULT_COOLDOWN_MS + 1);
    const ok = await runWithFallback(opts(async () => ({ value: "from the model" })), deps);
    expect(ok).toMatchObject({ source: "ai", value: "from the model" });

    // a rate limit is a fallback row, not an error, so it does not eat the daily cap
    expect(logs[0]).toMatchObject({ status: "fallback" });
    expect(logs[0].response).toContain("[rate_limited]");
  });

  it("uses the API's own retry time for the cooldown", async () => {
    const { deps, opts, advance } = setup();
    await runWithFallback(
      opts(async () => {
        throw Object.assign(new Error("slow down"), { statusCode: 429, responseHeaders: { "retry-after": "5" } });
      }),
      deps,
    );
    advance(4_000);
    expect((await runWithFallback(opts(async () => ({ value: "x" })), deps)).reason).toBe("rate_limited");
    advance(1_100);
    expect((await runWithFallback(opts(async () => ({ value: "x" })), deps)).source).toBe("ai");
  });

  it("other failures are still plain errors and do not start a cooldown", async () => {
    const { deps, logs, opts } = setup();
    const r = await runWithFallback(opts(async () => { throw new Error("503 overloaded"); }), deps);
    expect(r).toMatchObject({ reason: "error", status: "error" });
    expect(logs[0].status).toBe("error");
    expect((await runWithFallback(opts(async () => ({ value: "x" })), deps)).source).toBe("ai");
  });

  it("the per-minute ceiling stops extra calls before they are made", async () => {
    const { deps, opts } = setup();
    deps.gate = createRateGate(2);
    let calls = 0;
    const run = async () => ((calls += 1), { value: "x" });
    await runWithFallback(opts(run), deps);
    await runWithFallback(opts(run), deps);
    const third = await runWithFallback(opts(run), deps);
    expect(calls).toBe(2);
    expect(third).toMatchObject({ source: "fallback", reason: "throttled" });
  });
});

describe("personal data never goes to the model", () => {
  it.each([
    ["call me on 9876543210 please", "[phone]"],
    ["my number is +91 98765 43210", "[phone]"],
    ["+919876543210", "[phone]"],
    ["whatsapp 98765-43210", "[phone]"],
    ["landline 0522 2345678", "[phone]"],
    ["email asha.verma+car@example.co.in thanks", "[email]"],
    ["my car is UP32AB1234", "[reg]"],
    ["reg up 32 ab 1234 diesel", "[reg]"],
    ["PAN ABCDE1234F", "[id]"],
    ["aadhaar 1234 5678 9012", "[id]"],
  ])("redacts: %s", (input, placeholder) => {
    const out = redactPii(input);
    expect(out).toContain(placeholder);
    expect(out).not.toMatch(/9876543210|98765 43210|43210|asha\.verma|AB1234|ab 1234|ABCDE1234F|5678 9012|2345678/);
  });

  it("leaves everything a car conversation needs", () => {
    for (const keep of [
      "Is UC-1182 still available?",
      "Model H ZX is ₹12,45,000 ex-showroom",
      "budget around 14 lakh, EMI for 60 months",
      "2022 Model C VX diesel, 41200 km, 2 owners",
      "test drive on 10 Nov at 11:07",
      "pincode 226001",
      "Vrooma Hazratganj, Lucknow",
    ]) {
      expect(redactPii(keep), keep).toBe(keep);
    }
  });

  it("sanitizeUserText redacts by default and can be told not to", () => {
    expect(sanitizeUserText("call 9876543210", 200)).toBe("call [phone]");
    expect(sanitizeUserText("call 9876543210", 200, { redact: false })).toBe("call 9876543210");
    expect(sanitizeUserText("hi\u0000 ​there", 100)).toBe("hi there");
  });

  it("the lead prompt carries the enquiry but not the buyer's number, email or plate", () => {
    const input: LeadAiInput = {
      ref: "LD-1", source: "web", status: "new", firstName: "Asha", modelName: "Model H ZX", isUsed: false,
      message: "Please call 9876543210 or mail asha@example.com about my car UP32AB1234, I want a Model H.",
      showroomName: "Hazratganj", consultantFirstName: "Rahul", firstContacted: false, createdAt: "2026-11-08T05:00:00Z",
      events: [{ type: "note_added", note: "Customer's other number is 9123456780", at: "x" }],
      chat: [{ role: "buyer", text: "my email is test.user@gmail.com" }],
      saved: [], bookings: [],
    };
    const prompt = buildLeadPrompt(input, new Date("2026-11-08T05:10:00Z"));
    expect(prompt).toContain("I want a Model H");
    expect(prompt).toContain("[phone]");
    expect(prompt).toContain("[email]");
    expect(prompt).toContain("[reg]");
    expect(prompt).not.toMatch(/9876543210|9123456780|asha@example|test\.user@|AB1234/);
  });
});

describe("model defaults and the thinking option", () => {
  it("default to Google's -latest aliases, which cannot be retired the way gemini-2.5-* was", () => {
    expect(DEFAULT_MODELS.google.fast).toBe("gemini-flash-lite-latest");
    expect(DEFAULT_MODELS.google.smart).toBe("gemini-flash-latest");
  });

  it("sends the thinking-off setting only to Gemini 2.5 fast models (newer models reject it with a 400)", () => {
    expect(thinkingOptionsFor("google", "gemini-2.5-flash-lite", "fast")).toEqual({ google: { thinkingConfig: { thinkingBudget: 0 } } });
    for (const id of ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash"]) {
      expect(thinkingOptionsFor("google", id, "fast"), id).toBeUndefined();
    }
    expect(thinkingOptionsFor("google", "gemini-2.5-flash", "smart")).toBeUndefined();
    expect(thinkingOptionsFor("anthropic", "gemini-2.5-flash-lite", "fast")).toBeUndefined();
  });
});

describe("circuit breaker for slow or overloaded models", () => {
  it("two failures in a row pause calls for 30 s; one failure, or a success in between, does not", () => {
    const gate = createRateGate();
    gate.failed(1_000);
    expect(gate.check(1_001)).toBeNull();
    gate.succeeded();
    gate.failed(2_000);
    expect(gate.check(2_001)).toBeNull(); // the success reset the count
    gate.failed(3_000);
    expect(gate.check(3_001)).toBe("cooldown");
    expect(gate.cause()).toBe("unavailable");
    expect(gate.check(3_000 + BREAKER_COOLDOWN_MS - 1)).toBe("cooldown");
    expect(gate.check(3_000 + BREAKER_COOLDOWN_MS)).toBeNull();
  });

  it("a rate limit keeps its own cause and longer wait", () => {
    const gate = createRateGate();
    gate.tripped(0);
    expect(gate.cause()).toBe("rate_limit");
    gate.failed(10);
    gate.failed(20);
    expect(gate.check(BREAKER_COOLDOWN_MS + 1)).toBe("cooldown"); // still inside the 60 s rate-limit wait
    expect(gate.cause()).toBe("rate_limit");
  });

  it("in the runner: an overloaded model costs two slow tries, then buyers get the rule-based answer instantly", async () => {
    const logs: AiLogEntry[] = [];
    let clock = 5_000_000;
    const deps: AiRunDeps = {
      enabled: () => true,
      resolveModel: () => ({ model: {} as never, id: "gemini-test" }),
      timeoutMs: () => 100,
      isOverCap: async () => false,
      log: async (e) => void logs.push(e),
      now: () => clock,
      gate: createRateGate(),
    };
    let calls = 0;
    const slow = (): AiRunOptions<string> => ({
      feature: "chat",
      action: "chat_answered",
      tier: "fast",
      run: () => {
        calls++;
        return new Promise(() => {}); // never answers: the 100 ms timeout fires
      },
      fallback: () => "rule-based answer",
    });

    expect((await runWithFallback(slow(), deps)).reason).toBe("timeout");
    expect((await runWithFallback(slow(), deps)).reason).toBe("timeout");
    const third = await runWithFallback(slow(), deps);
    expect(third).toMatchObject({ source: "fallback", reason: "unavailable", value: "rule-based answer" });
    expect(calls).toBe(2); // the third buyer did not wait at all

    clock += BREAKER_COOLDOWN_MS + 1;
    const ok = await runWithFallback({ ...slow(), run: async () => ({ value: "from the model" }) }, deps);
    expect(ok).toMatchObject({ source: "ai", value: "from the model" });
  });
});

