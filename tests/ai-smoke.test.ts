import { describe, expect, it } from "vitest";

import { FAST_CANDIDATES, SMART_CANDIDATES, filterCandidates, pickBest, usableCandidate, type Probe } from "@/../scripts/ai-smoke";

describe("candidate selection", () => {
  it("never offers pro, preview, experimental, image, audio, live or computer-use models", () => {
    for (const bad of [
      "gemini-3.1-pro-preview",
      "gemini-pro-latest",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-flash-image",
      "gemini-2.5-flash-preview-tts",
      "gemini-3.8-flash-tts",
      "gemini-2.5-computer-use-preview-10-2025",
      "gemini-omni-1.2-flash",
      "gemini-4-argon",
      "gemini-robotics-er-2-preview",
      "gemini-3.5-transcribe",
    ]) {
      expect(usableCandidate(bad), bad).toBe(false);
    }
    for (const good of ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"]) {
      expect(usableCandidate(good), good).toBe(true);
    }
  });

  it("keeps only candidates the key lists, in the preferred order, and does not rely on the retired 2.5 family", () => {
    const listed = ["models/gemini-2.5-flash", "models/gemini-3.5-flash", "models/gemini-3.1-flash-lite", "models/gemini-3.8-flash", "models/gemini-3.1-pro-preview"];
    expect(filterCandidates(listed, FAST_CANDIDATES)).toEqual(["gemini-3.1-flash-lite"]);
    expect(filterCandidates(listed, SMART_CANDIDATES)).toEqual(["gemini-3.5-flash", "gemini-3.8-flash"]);
    expect([...FAST_CANDIDATES, ...SMART_CANDIDATES].some((n) => n.includes("2.5"))).toBe(false);
    expect(filterCandidates([], FAST_CANDIDATES)).toEqual([]);
  });
});

describe("pickBest", () => {
  const probe = (model: string, ok: boolean, ms: number): Probe => ({ model, ok, ms, note: "" });

  it("takes the fastest model that actually answered, within the tier's pool", () => {
    const probes = [probe("gemini-3.1-flash-lite", false, 900), probe("gemini-3.5-flash-lite", true, 2400), probe("gemini-flash-lite-latest", true, 1500)];
    expect(pickBest(probes, FAST_CANDIDATES)).toBe("gemini-flash-lite-latest");
  });

  it("skips a model that took minutes, and one that failed, however new it is", () => {
    const probes = [probe("gemini-3.8-flash", true, 172_000), probe("gemini-3.5-flash", true, 3100), probe("gemini-3.6-flash", false, 400)];
    expect(pickBest(probes, SMART_CANDIDATES)).toBe("gemini-3.5-flash");
  });

  it("falls back to any model that answered when the tier's own pool had none, and to null when nothing did", () => {
    expect(pickBest([probe("gemini-3.5-flash", true, 2000)], FAST_CANDIDATES)).toBe("gemini-3.5-flash");
    expect(pickBest([probe("gemini-3.5-flash", false, 2000)], SMART_CANDIDATES)).toBeNull();
    expect(pickBest([], SMART_CANDIDATES)).toBeNull();
  });
});
