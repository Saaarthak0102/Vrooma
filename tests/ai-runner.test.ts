import { describe, expect, it, vi } from "vitest";

import { guardAiText } from "@/server/ai/guard";
import { runWithFallback, type AiRunDeps, type AiRunOptions } from "@/server/ai/runner";
import type { AiLogEntry } from "@/server/ai/types";
import { istDayStart } from "@/server/ai/budget";

function makeDeps(overrides: Partial<AiRunDeps> = {}) {
  const logs: AiLogEntry[] = [];
  const deps: AiRunDeps = {
    enabled: () => true,
    resolveModel: () => ({ model: {} as any, id: "test-model" }),
    timeoutMs: () => 50,
    isOverCap: async () => false,
    log: async (entry) => {
      logs.push(entry);
    },
    now: () => Date.now(),
    ...overrides,
  };
  return { deps, logs };
}

function options(
  run: AiRunOptions<string>["run"],
  extra: Partial<AiRunOptions<string>> = {},
): AiRunOptions<string> {
  return {
    feature: "lead_summary",
    action: "copilot_generated",
    tier: "smart",
    promptForLog: "Lead VR-1 · Model H · source web",
    run,
    guard: (value) => guardAiText(value, { groundingSources: [] }),
    fallback: () => "rule-based draft",
    ...extra,
  };
}

describe("runWithFallback", () => {
  it("returns the model output and logs tokens when everything passes", async () => {
    const { deps, logs } = makeDeps();
    const result = await runWithFallback(
      options(async () => ({ value: "Hi Asha, happy to help with the Model H.", usage: { inputTokens: 120, outputTokens: 18 } })),
      deps,
    );
    expect(result).toMatchObject({ source: "ai", status: "ok", value: "Hi Asha, happy to help with the Model H." });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      status: "ok",
      model: "test-model",
      feature: "lead_summary",
      usage: { inputTokens: 120, outputTokens: 18 },
    });
  });

  it("uses the fallback without calling the model when AI is disabled", async () => {
    const run = vi.fn();
    const { deps, logs } = makeDeps({ enabled: () => false });
    const result = await runWithFallback(options(run), deps);
    expect(result).toMatchObject({ source: "fallback", reason: "disabled", value: "rule-based draft" });
    expect(run).not.toHaveBeenCalled();
    expect(logs).toHaveLength(0);
  });

  it("uses the fallback when the feature is over its daily cap", async () => {
    const run = vi.fn();
    const { deps } = makeDeps({ isOverCap: async () => true });
    const result = await runWithFallback(options(run), deps);
    expect(result).toMatchObject({ source: "fallback", reason: "over_cap" });
    expect(run).not.toHaveBeenCalled();
  });

  it("blocks a draft that offers a discount and falls back", async () => {
    const { deps, logs } = makeDeps();
    const result = await runWithFallback(
      options(async () => ({ value: "Great news, I can give you a discount if you come today." })),
      deps,
    );
    expect(result).toMatchObject({ source: "fallback", status: "blocked", reason: "discount", value: "rule-based draft" });
    expect(logs[0]).toMatchObject({ status: "blocked" });
    expect(logs[0].response).toContain("[blocked: discount]");
  });

  it("blocks an invented price (empty grounding sources forbid any rupee amount)", async () => {
    const { deps } = makeDeps();
    const result = await runWithFallback(options(async () => ({ value: "The Model H is ₹12,45,000." })), deps);
    expect(result).toMatchObject({ source: "fallback", status: "blocked", reason: "ungrounded_amount" });
  });

  it("blocks a leaked registration number", async () => {
    const { deps } = makeDeps();
    const result = await runWithFallback(options(async () => ({ value: "That car is UP32 AB 1234, 2 owners." })), deps);
    expect(result).toMatchObject({ source: "fallback", reason: "registration_number" });
  });

  it("falls back and logs an error when the model throws", async () => {
    const { deps, logs } = makeDeps();
    const result = await runWithFallback(
      options(async () => {
        throw new Error("503 overloaded");
      }),
      deps,
    );
    expect(result).toMatchObject({ source: "fallback", status: "error", reason: "error" });
    expect(logs[0]).toMatchObject({ status: "error" });
    expect(logs[0].response).toContain("503 overloaded");
  });

  it("falls back on timeout even if the model never resolves", async () => {
    const { deps, logs } = makeDeps({ timeoutMs: () => 20 });
    const result = await runWithFallback(options(() => new Promise(() => {})), deps);
    expect(result).toMatchObject({ source: "fallback", status: "error", reason: "timeout" });
    expect(logs[0].response).toContain("[timeout]");
  });

  it("passes an abort signal to the model call", async () => {
    const { deps } = makeDeps({ timeoutMs: () => 20 });
    let received: AbortSignal | undefined;
    await runWithFallback(
      options(({ signal }) => {
        received = signal;
        return new Promise(() => {});
      }),
      deps,
    );
    expect(received?.aborted).toBe(true);
  });
});

describe("istDayStart", () => {
  it("rolls over at midnight India time, not UTC", () => {
    // 2026-11-08 20:00 UTC is 01:30 IST on the 9th -> day starts 2026-11-08 18:30 UTC.
    expect(istDayStart(new Date("2026-11-08T20:00:00Z")).toISOString()).toBe("2026-11-08T18:30:00.000Z");
    // 2026-11-08 10:00 UTC is 15:30 IST on the 8th -> day starts 2026-11-07 18:30 UTC.
    expect(istDayStart(new Date("2026-11-08T10:00:00Z")).toISOString()).toBe("2026-11-07T18:30:00.000Z");
  });
});
