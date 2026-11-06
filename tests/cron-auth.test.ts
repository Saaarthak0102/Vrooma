import { describe, it, expect, vi } from "vitest";

// These tests prove AUTHORISATION only. The routes use the admin (service-role) client, so against the live
// DEV project a "200 with the secret" call really drains the outbox, anonymises old leads and runs account
// erasures. Stub the client with an empty, chainable result so nothing is read or written.
vi.mock("@/lib/supabase/admin", () => {
  const empty = { data: [], error: null, count: 0 };
  const chain: any = new Proxy(function () {}, {
    get: (_target, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve(empty) : chain),
    apply: () => chain,
  });
  return { createAdminClient: () => chain };
});
import { NextRequest } from "next/server";
import { GET as getSla } from "@/app/api/cron/sla/route";
import { GET as getOutbox } from "@/app/api/cron/outbox/route";
import { POST as postRetention } from "@/app/api/cron/data-retention/route";
import { POST as postDeletions } from "@/app/api/cron/finalize-deletions/route";
import { env } from "@/lib/env";

describe("Cron Endpoints Secret Protection & Authentication", () => {
  const cronSecret = env.CRON_SECRET || "vrooma-cron-secret-local";

  describe("Rejection of unauthenticated calls (401 Unauthorized)", () => {
    it("rejects /api/cron/sla without authorization header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/sla");
      const res = await getSla(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it("rejects /api/cron/outbox without authorization header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/outbox");
      const res = await getOutbox(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it("rejects /api/cron/data-retention without authorization header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/data-retention", {
        method: "POST",
      });
      const res = await postRetention(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it("rejects /api/cron/finalize-deletions without authorization header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/finalize-deletions", {
        method: "POST",
      });
      const res = await postDeletions(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it("rejects invalid Bearer tokens", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/sla", {
        headers: { Authorization: "Bearer wrong-secret-token" },
      });
      const res = await getSla(req);
      expect(res.status).toBe(401);
    });
  });

  describe("Successful authorization with valid CRON_SECRET", () => {
    it("authorizes /api/cron/sla with valid CRON_SECRET header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/sla", {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const res = await getSla(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.checkedAt).toBeDefined();
    });

    it("authorizes /api/cron/outbox with valid CRON_SECRET header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/outbox", {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const res = await getOutbox(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("authorizes /api/cron/data-retention with valid CRON_SECRET header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/data-retention", {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const res = await postRetention(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("authorizes /api/cron/finalize-deletions with valid CRON_SECRET header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/finalize-deletions", {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const res = await postDeletions(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});

