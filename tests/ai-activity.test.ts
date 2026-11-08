import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  capUsageToday,
  featureLabel,
  filterActivity,
  isModelCall,
  previewOf,
  reasonLabel,
  reasonOf,
  summarize,
  type AiActivityRow,
} from "@/lib/ai-activity";

// 2026-11-08 12:00 IST
const NOW = new Date("2026-11-08T06:30:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

let n = 0;
const row = (p: Partial<AiActivityRow>): AiActivityRow => ({
  id: `r${++n}`,
  createdAt: hoursAgo(1),
  feature: "chat",
  action: "chat_answered",
  status: "ok",
  model: "gemini-3.1-flash-lite",
  latencyMs: 2000,
  inputTokens: 500,
  outputTokens: 80,
  prompt: "Buyer chat · intent emi · 26 chars",
  response: "About ₹21,002 a month.",
  leadId: null,
  leadRef: null,
  customerName: null,
  ...p,
});

describe("reasons", () => {
  it("reads the reason from the stored prefix and says it in plain words", () => {
    expect(reasonOf(row({ status: "error", response: "[timeout] ai_timeout" }))).toBe("timeout");
    expect(reasonOf(row({ status: "blocked", response: "[blocked: ungrounded_amount] The Model H is ₹9,99,000" }))).toBe("ungrounded_amount");
    expect(reasonOf(row({ status: "fallback", response: "[rate_limited] 429" }))).toBe("rate_limited");
    expect(reasonOf(row({ status: "ok" }))).toBeNull();
    expect(reasonLabel("timeout")).toBe("Model took too long");
    expect(reasonLabel("something_new")).toBe("something new");
    expect(reasonLabel(null)).toBe("");
  });

  it("previews the output without the bracketed reason and trims long text", () => {
    expect(previewOf(row({ response: "[blocked: discount] I can offer a price cut" }))).toBe("I can offer a price cut");
    expect(previewOf(row({ response: "x".repeat(300) }), 50)).toHaveLength(50);
  });

  it("labels features and tells reply-audit rows from model calls", () => {
    expect(featureLabel("lead_agent")).toBe("Next steps agent");
    expect(featureLabel("brand_new")).toBe("brand new");
    expect(isModelCall({ action: "chat_answered" })).toBe(true);
    expect(isModelCall({ action: "reply_sent_edited" })).toBe(false);
  });
});

describe("filters", () => {
  const rows = [
    row({ createdAt: hoursAgo(1) }),
    row({ createdAt: hoursAgo(30), feature: "lead_summary", status: "fallback" }), // yesterday
    row({ createdAt: hoursAgo(24 * 5), status: "error" }),
    row({ createdAt: hoursAgo(24 * 20), feature: "digest" }),
  ];

  it("follows the date range in Indian days", () => {
    expect(filterActivity(rows, { ...DEFAULT_FILTERS, range: "today" }, NOW)).toHaveLength(1);
    expect(filterActivity(rows, { ...DEFAULT_FILTERS, range: "7d" }, NOW)).toHaveLength(3);
    expect(filterActivity(rows, { ...DEFAULT_FILTERS, range: "30d" }, NOW)).toHaveLength(4);
  });

  it("narrows by feature and by result", () => {
    expect(filterActivity(rows, { feature: "lead_summary", status: "all", range: "30d" }, NOW)).toHaveLength(1);
    expect(filterActivity(rows, { feature: "all", status: "error", range: "30d" }, NOW)).toHaveLength(1);
    expect(filterActivity(rows, { feature: "digest", status: "error", range: "30d" }, NOW)).toHaveLength(0);
  });
});

describe("summary", () => {
  const rows = [
    row({ latencyMs: 1000 }),
    row({ latencyMs: 3000 }),
    row({ latencyMs: 5000 }),
    row({ feature: "lead_summary", status: "error", response: "[timeout] ai_timeout", latencyMs: 10_000 }),
    row({ status: "fallback", response: "[rate_limited] 429", latencyMs: 20 }),
    row({ status: "blocked", response: "[blocked: discount] no" }),
    row({ action: "reply_sent_edited" }), // not a model call
  ];
  const s = summarize(rows, NOW, 3);

  it("counts model calls only, by result, with the answered share", () => {
    expect(s.total).toBe(6);
    expect([s.ok, s.fallback, s.blocked, s.error]).toEqual([3, 1, 1, 1]);
    expect(s.successRate).toBe(50);
  });

  it("takes latency from answered calls only", () => {
    expect(s.medianLatencyMs).toBe(3000);
    expect(s.p95LatencyMs).toBe(5000);
  });

  it("breaks the numbers down by feature, reason and day", () => {
    expect(s.byFeature.find((f) => f.feature === "chat")).toMatchObject({ total: 5, ok: 3, problems: 2 });
    expect(s.topReasons.map((r) => r.reason).sort()).toEqual(["discount", "rate_limited", "timeout"]);
    expect(s.perDay).toHaveLength(3);
    expect(s.perDay[2]).toMatchObject({ day: "2026-11-08", total: 6, problems: 3 });
    expect(s.inputTokens).toBe(500 * 6);
  });

  it("is empty-safe", () => {
    const e = summarize([], NOW, 2);
    expect(e).toMatchObject({ total: 0, successRate: null, medianLatencyMs: null });
    expect(e.perDay).toHaveLength(2);
  });
});

describe("daily cap usage", () => {
  it("counts what the cap counts: today's ok, blocked and failed calls, not fallbacks or yesterday", () => {
    const usage = capUsageToday(
      [
        row({}),
        row({ status: "blocked" }),
        row({ status: "fallback" }),
        row({ createdAt: hoursAgo(30) }),
        row({ feature: "digest", status: "error" }),
        row({ action: "reply_sent_unedited" }),
      ],
      NOW,
    );
    expect(usage).toEqual({ chat: 2, digest: 1 });
  });
});
