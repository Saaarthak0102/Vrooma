import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { QUICK_LOGIN_PERSONAS } from "@/lib/demo-personas";
import { demoLoginEnabled } from "@/lib/demo-mode";

const calls = {
  generateLink: [] as any[],
  verifyOtp: [] as any[],
  audit: [] as any[],
};
let generateResult: any;
let verifyResult: any;
let allowRate = true;
let originBlocked = false;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        generateLink: async (args: any) => {
          calls.generateLink.push(args);
          return generateResult;
        },
      },
    },
    from: (table: string) => ({
      insert: async (row: any) => {
        calls.audit.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: async (args: any) => {
        calls.verifyOtp.push(args);
        return verifyResult;
      },
    },
  }),
}));
vi.mock("@/server/security/rate-limit", () => ({ rateLimit: async () => allowRate }));
vi.mock("@/server/auth/api-guard", async () => {
  const { NextResponse } = await import("next/server");
  return { guardOrigin: () => (originBlocked ? NextResponse.json({ ok: false }, { status: 403 }) : null) };
});

const post = (body: unknown, raw?: string) =>
  new NextRequest("http://localhost/api/auth/demo-login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: raw ?? JSON.stringify(body),
  });

describe("POST /api/auth/demo-login", () => {
  beforeEach(() => {
    calls.generateLink.length = 0;
    calls.verifyOtp.length = 0;
    calls.audit.length = 0;
    allowRate = true;
    originBlocked = false;
    generateResult = { data: { properties: { hashed_token: "hash-123" } }, error: null };
    verifyResult = { data: { session: { access_token: "x" }, user: { id: "u1", email: "e@x" } }, error: null };
    process.env.DEMO_LOGIN = "true";
  });

  it("is off (404) unless DEMO_LOGIN=true, and then touches nothing", async () => {
    delete process.env.DEMO_LOGIN;
    const { POST } = await import("@/app/api/auth/demo-login/route");
    await expect(POST(post({ role: "admin" }))).rejects.toThrow(/404|NEXT_NOT_FOUND/);
    process.env.DEMO_LOGIN = "false";
    await expect(POST(post({ role: "admin" }))).rejects.toThrow(/404|NEXT_NOT_FOUND/);
    expect(calls.generateLink).toEqual([]);
    expect(calls.verifyOtp).toEqual([]);
  });

  it("the server flag is exactly the string 'true'", () => {
    expect(demoLoginEnabled({ DEMO_LOGIN: "true" })).toBe(true);
    for (const v of [undefined, "", "false", "1", "TRUE", "yes"]) expect(demoLoginEnabled({ DEMO_LOGIN: v }), String(v)).toBe(false);
  });

  it.each([
    ["buyer", "/dashboard"],
    ["consultant", "/staff"],
    ["manager", "/staff"],
    ["admin", "/admin"],
  ])("signs in the %s demo account and lands on %s, without a password or an email", async (role, destination) => {
    const { POST } = await import("@/app/api/auth/demo-login/route");
    const res = await POST(post({ role }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, role, destination });
    const persona = QUICK_LOGIN_PERSONAS[role as keyof typeof QUICK_LOGIN_PERSONAS];
    expect(calls.generateLink).toEqual([{ type: "magiclink", email: persona.email }]); // generates a link; sends nothing
    expect(calls.verifyOtp).toEqual([{ token_hash: "hash-123", type: "magiclink" }]);
    expect(calls.audit).toHaveLength(1);
    expect(calls.audit[0]).toMatchObject({ table: "audit_log", row: { table_name: "demo_login", action: "DEMO_LOGIN", record_id: persona.id } });
  });

  it("only ever signs in the four quick-login accounts: unknown roles and bad bodies are rejected before anything runs", async () => {
    const { POST } = await import("@/app/api/auth/demo-login/route");
    for (const body of [{ role: "owner" }, { role: "dev-admin@vrooma.in" }, { role: "" }, {}, { email: "dev-admin@vrooma.in" }]) {
      const res = await POST(post(body));
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect((await POST(post(null, "{not json"))).status).toBe(400);
    expect(calls.generateLink).toEqual([]);
  });

  it("is rate limited per visitor", async () => {
    allowRate = false;
    const { POST } = await import("@/app/api/auth/demo-login/route");
    const res = await POST(post({ role: "admin" }));
    expect(res.status).toBe(429);
    expect(calls.generateLink).toEqual([]);
  });

  it("blocks cross-site requests", async () => {
    originBlocked = true;
    const { POST } = await import("@/app/api/auth/demo-login/route");
    const res = await POST(post({ role: "admin" }));
    expect(res.status).toBe(403);
    expect(calls.generateLink).toEqual([]);
  });

  it("reports a missing demo account clearly and does not try to sign in", async () => {
    generateResult = { data: null, error: { message: "User not found" } };
    const { POST } = await import("@/app/api/auth/demo-login/route");
    const res = await POST(post({ role: "manager" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/not set up/i);
    expect(calls.verifyOtp).toEqual([]);
  });

  it("reports a rejected link and writes no audit row for a sign-in that did not happen", async () => {
    verifyResult = { data: { session: null, user: null }, error: { message: "Token has expired or is invalid" } };
    const { POST } = await import("@/app/api/auth/demo-login/route");
    const res = await POST(post({ role: "buyer" }));
    expect(res.status).toBe(401);
    expect(calls.audit).toEqual([]);
  });
});

describe("the persona buttons", () => {
  it("are drawn only in development or demo mode, using the shared flags", () => {
    for (const file of ["src/app/(auth)/sign-in/page.tsx", "src/components/auth/SignInSheet.tsx"]) {
      const src = fs.readFileSync(file, "utf8");
      expect(src, file).toContain("SHOW_PERSONA_LOGIN");
      expect(src, file).toContain("PERSONA_LOGIN_TITLE");
      expect(src, file).not.toContain('process.env.NODE_ENV === "development"');
    }
    const provider = fs.readFileSync("src/components/auth/AuthProvider.tsx", "utf8");
    expect(provider).toContain("PERSONA_LOGIN_ENDPOINT");
    expect(provider).not.toContain('fetch("/api/auth/dev-login"');
  });

  it("choose the demo route outside development and require both flags to be drawn there", () => {
    const flags = fs.readFileSync("src/lib/demo-mode.ts", "utf8");
    expect(flags).toContain('"/api/auth/demo-login"');
    expect(flags).toContain('process.env.NEXT_PUBLIC_DEMO_LOGIN === "true"');
    expect(flags).toContain('env.DEMO_LOGIN === "true"');
  });

  it("do not weaken the production backdoor rules: dev login stays development-only", () => {
    const devRoute = fs.readFileSync("src/app/api/auth/dev-login/route.ts", "utf8");
    expect(devRoute).toContain('process.env.NODE_ENV === "development"');
    expect(devRoute).toContain("notFound()");
    const checkEnv = fs.readFileSync("scripts/check-env.mjs", "utf8");
    expect(checkEnv).toContain("ALLOW_DEV_LOGIN is enabled for a production target");
  });
});
