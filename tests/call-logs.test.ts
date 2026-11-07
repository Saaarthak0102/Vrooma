import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { maskCaller, hashCaller, callWebhookSchema, manualCallSchema } from "@/lib/calls";

describe("caller privacy helpers", () => {
  it("masks all but the last four digits", () => {
    expect(maskCaller("+91 98765 43210")).toBe("+91 ******3210");
    expect(maskCaller("9876543210")).toBe("+91 ******3210");
    expect(maskCaller("")).toBeNull();
    expect(maskCaller("12")).toBeNull();
  });

  it("hashes the same person the same way regardless of formatting, and differently per salt", () => {
    const a = hashCaller("+91 98765 43210", "s1");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCaller("9876543210", "s1")).toBe(a);
    expect(hashCaller("9876543210", "s2")).not.toBe(a);
    expect(hashCaller(undefined, "s1")).toBeNull();
  });
});

describe("call payload schemas", () => {
  it("accepts a minimal vendor payload and defaults to inbound", () => {
    const r = callWebhookSchema.parse({ externalId: "abc", outcome: "missed" });
    expect(r.direction).toBe("inbound");
  });

  it("rejects unknown outcomes, empty ids and bad workshop ids", () => {
    expect(callWebhookSchema.safeParse({ externalId: "abc", outcome: "busy" }).success).toBe(false);
    expect(callWebhookSchema.safeParse({ externalId: " ", outcome: "missed" }).success).toBe(false);
    expect(callWebhookSchema.safeParse({ externalId: "a", outcome: "missed", workshopId: "nope" }).success).toBe(false);
    expect(manualCallSchema.safeParse({ outcome: "answered", notes: "x".repeat(501) }).success).toBe(false);
  });
});

describe("POST /api/webhooks/calls auth", () => {
  const original = process.env.CALLS_WEBHOOK_SECRET;
  beforeEach(() => {
    delete process.env.CALLS_WEBHOOK_SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CALLS_WEBHOOK_SECRET;
    else process.env.CALLS_WEBHOOK_SECRET = original;
  });

  const req = (headers: Record<string, string> = {}) =>
    new NextRequest("http://localhost/api/webhooks/calls", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ externalId: "c1", outcome: "missed" }),
    });

  it("is closed (503) when no secret is configured", async () => {
    const { POST } = await import("@/app/api/webhooks/calls/route");
    expect((await POST(req())).status).toBe(503);
  });
});

describe("migration 0034 call_logs", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0034_call_logs.sql"), "utf8");
  it("has RLS, a unique vendor id, and staff-only metrics", () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_call_logs_external/);
    expect(sql).toMatch(/private\.is_staff\(\)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.get_call_metrics/);
    expect(sql).not.toMatch(/caller_phone\b/); // never store the raw number
  });
});
