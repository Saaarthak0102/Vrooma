/**
 * Regression tests for the route handlers that used to run with the admin client and no authentication.
 * With no session cookie every one of them must now refuse the request BEFORE touching any data.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET as leadsGet } from "@/app/api/leads/route";
import { GET as leadGet, PATCH as leadPatch } from "@/app/api/leads/[id]/route";
import { GET as bookingsGet, POST as bookingsPost } from "@/app/api/bookings/route";
import { GET as profileGet, PUT as profilePut } from "@/app/api/me/profile/route";
import { POST as deletePost } from "@/app/api/me/delete/route";
import { POST as outboxSend } from "@/app/api/outbox/send/route";
import { POST as copilotPost } from "@/app/api/ai/lead-copilot/route";
import { POST as leadsImportPost } from "@/app/api/leads/import/route";

const url = (p: string) => `http://localhost:3000${p}`;
const json = (p: string, method: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(url(p), {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const ctx = { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000001" }) };

describe("unauthenticated callers are refused", () => {
  it("GET /api/leads", async () => {
    expect((await leadsGet(new NextRequest(url("/api/leads")))).status).toBe(401);
  });

  it("GET and PATCH /api/leads/[id]", async () => {
    expect((await leadGet(new NextRequest(url("/api/leads/x")), ctx))?.status).toBe(401);
    expect((await leadPatch(json("/api/leads/x", "PATCH", { status: "won" }), ctx))?.status).toBe(401);
  });

  it("GET /api/bookings is refused and ignores a client-supplied userId; POST is retired", async () => {
    expect((await bookingsGet()).status).toBe(401);
    expect((await bookingsPost()).status).toBe(410);
  });

  it("GET and PUT /api/me/profile", async () => {
    expect((await profileGet()).status).toBe(401);
    const res = await profilePut(json("/api/me/profile", "PUT", { id: "someone-else", full_name: "Mallory" }));
    expect(res.status).toBe(401);
  });

  it("POST /api/me/delete", async () => {
    expect((await deletePost()).status).toBe(401);
  });

  it("POST /api/outbox/send needs the cron secret or an admin session", async () => {
    const body = { channel: "email", to: "victim@example.com", template: "x", body: "phish" };
    expect((await outboxSend(json("/api/outbox/send", "POST", body))).status).toBe(401);
    const wrong = await outboxSend(json("/api/outbox/send", "POST", body, { authorization: "Bearer not-the-secret" }));
    expect(wrong.status).toBe(401);
  });

  it("POST /api/leads/import refuses anonymous callers before parsing the CSV", async () => {
    const res = await leadsImportPost(json("/api/leads/import", "POST", { csv: "name,phone,A,9876543210" }));
    expect(res.status).toBe(401);
  });

  it("POST /api/ai/lead-copilot", async () => {
    const res = await copilotPost(json("/api/ai/lead-copilot", "POST", { leadId: "x" }));
    expect(res.status).toBe(401);
  });
});

describe("source-level guarantees", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("/api/me/profile never reads a user id from the request", () => {
    const src = read("src/app/api/me/profile/route.ts");
    expect(src).not.toMatch(/searchParams\.get\(["']id["']\)/);
    expect(src).not.toMatch(/usr-buyer-1/);
    expect(src).toContain("session.user.id");
  });

  it("/api/bookings never reads userId from the query and has no hard-coded user", () => {
    const src = read("src/app/api/bookings/route.ts");
    expect(src).not.toMatch(/searchParams/);
    expect(src).not.toMatch(/usr-buyer-1/);
  });

  it("POST /api/leads returns a receipt, not the stored lead row", () => {
    const src = read("src/app/api/leads/route.ts");
    expect(src).not.toMatch(/data:\s*lead\s*\}/);
    expect(src).toMatch(/assigned:\s*Boolean\(/);
  });

  it("the model page and its client view carry no price rule and no mock price data", () => {
    const view = read("src/app/(public)/cars/[modelSlug]/ModelDetailView.tsx");
    const page = read("src/app/(public)/cars/[modelSlug]/page.tsx");
    expect(view).not.toMatch(/mock\/price-rules|mockPriceRules/);
    expect(view).not.toMatch(/initialPriceRule/);
    expect(page).not.toMatch(/initialPriceRule/);
    expect(view).toContain("getOnRoadAction");
  });

  it("no cron route falls back to a hard-coded secret any more", () => {
    for (const r of ["sla", "outbox", "data-retention", "finalize-deletions"]) {
      const src = read(`src/app/api/cron/${r}/route.ts`);
      expect(src, r).not.toContain("vrooma-cron-secret-local");
      expect(src, r).toContain("authorizeCron");
    }
  });

  it("sendLeadReplyAction updates lead status as the signed-in consultant, not the admin client", () => {
    const src = read("src/server/actions/leads.ts");
    const idx = src.indexOf("lead.status === \"new\"");
    expect(idx).toBeGreaterThan(0);
    const tail = src.slice(idx, idx + 900);
    expect(tail).toContain("userClient ?? admin");
    expect(tail).not.toMatch(/await admin\.rpc\("set_lead_status"/);
  });
});

describe("consent route and prompt/copy fixes", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("POST /api/consent refuses signed-out callers instead of faking success", async () => {
    const { POST } = await import("@/app/api/consent/route");
    const res = await POST(json("/api/consent", "POST", { purpose: "marketing", granted: true }));
    expect(res.status).toBe(401);
  });

  it("/api/consent stores a consent row", () => {
    expect(read("src/app/api/consent/route.ts")).toContain("recordConsent(");
  });

  it("the chat widget no longer quotes a hard-coded on-road price", () => {
    expect(read("src/components/chat/ChatWidget.tsx")).not.toMatch(/14,59,450|on-road price is approximately/);
  });

  it("the AI prompt does not suggest free bundles", () => {
    expect(read("src/server/ai/prompts/lead-reply.ts")).not.toMatch(/complimentary accessory bundles/);
  });

  it("dashboard booking dates use a fixed time zone (hydration-safe)", () => {
    expect(read("src/components/dashboard/BookingCard.tsx")).toMatch(/timeZone: "Asia\/Kolkata"/);
    expect(read("src/components/dashboard/BookingDetailsDialog.tsx")).toMatch(/timeZone: "Asia\/Kolkata"/);
  });
});
