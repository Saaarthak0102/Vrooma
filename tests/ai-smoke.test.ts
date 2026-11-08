import { describe, expect, it } from "vitest";

import { recommendModels, type ListedModel } from "@/../scripts/ai-smoke";

const m = (name: string, methods: string[] = ["generateContent"]): ListedModel => ({ name: `models/${name}`, methods });

describe("recommendModels", () => {
  it("picks the newest stable flash-lite and flash", () => {
    const rec = recommendModels([
      m("gemini-2.0-flash"),
      m("gemini-2.5-flash"),
      m("gemini-2.5-flash-lite"),
      m("gemini-2.0-flash-lite"),
      m("gemini-2.5-pro"),
      m("embedding-001", ["embedContent"]),
    ]);
    expect(rec).toEqual({ fast: "gemini-2.5-flash-lite", smart: "gemini-2.5-flash" });
  });

  it("prefers a newer generation when the key has one", () => {
    expect(recommendModels([m("gemini-2.5-flash"), m("gemini-3.1-flash"), m("gemini-3.1-flash-lite"), m("gemini-2.5-flash-lite")])).toEqual({
      fast: "gemini-3.1-flash-lite",
      smart: "gemini-3.1-flash",
    });
  });

  it("ignores previews, experiments, image/audio/live models and anything that cannot generate content", () => {
    const rec = recommendModels([
      m("gemini-3.0-flash-preview"),
      m("gemini-3.0-flash-lite-exp"),
      m("gemini-2.5-flash-image"),
      m("gemini-2.5-flash-preview-tts"),
      m("gemini-2.5-flash-live"),
      m("gemini-2.5-flash", ["embedContent"]),
      m("gemini-2.0-flash"),
    ]);
    expect(rec).toEqual({ fast: null, smart: "gemini-2.0-flash" });
  });

  it("returns nulls for an empty list rather than guessing", () => {
    expect(recommendModels([])).toEqual({ fast: null, smart: null });
  });
});
