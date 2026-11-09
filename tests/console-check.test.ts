import { describe, it, expect } from "vitest";
import { validateTarget, analyzeCsp, judge, extractRef } from "../scripts/console-check.mjs";

type Guard = { ok: boolean; error?: string };
const validate = validateTarget as unknown as (a: Record<string, unknown>) => Guard;
const DEV_URL = "https://eobtzcwinjmimzisypca.supabase.co";
const PROD_URL = "https://zdasktnbdjkjtoncojsy.supabase.co";
const RETIRED_PROD_URL = "https://ajumkjokagqfdikfguti.supabase.co";

describe("console-check target guard", () => {
  it("accepts localhost + the DEV project", () => {
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: DEV_URL }).ok).toBe(true);
  });

  it("refuses the PRODUCTION project and the deleted legacy project", () => {
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: PROD_URL }).ok).toBe(false);
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: RETIRED_PROD_URL }).ok).toBe(false);
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: "https://gmyrehlrmifxckszrdje.supabase.co" }).ok).toBe(false);
  });

  it("refuses any unknown project, a missing URL, and non-localhost app URLs", () => {
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co" }).ok).toBe(false);
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: "" }).ok).toBe(false);
    expect(validate({ baseUrl: "https://vrooma.in", supabaseUrl: DEV_URL }).ok).toBe(false);
    expect(validate({ baseUrl: "https://localhost.evil.com", supabaseUrl: DEV_URL }).ok).toBe(false);
  });

  it("refuses APP_ENV=production and a --prod flag", () => {
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: DEV_URL, env: { APP_ENV: "production" } }).ok).toBe(false);
    expect(validate({ baseUrl: "http://localhost:3009", supabaseUrl: DEV_URL, args: ["--prod"] }).ok).toBe(false);
  });

  it("extracts refs", () => {
    expect(extractRef(DEV_URL)).toBe("eobtzcwinjmimzisypca");
    expect(extractRef("not a url")).toBeNull();
  });
});

describe("CSP analysis", () => {
  it("flags unsafe-inline without a nonce", () => {
    const a = analyzeCsp("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co");
    expect(a.mode).toBe("enforcing");
    expect(a.unsafeInline).toBe(true);
    expect(a.unsafeEval).toBe(true);
    expect(a.verdict).toMatch(/^WEAK/);
  });

  it("accepts a nonce-based policy (unsafe-inline is ignored by browsers when a nonce is present)", () => {
    const a = analyzeCsp("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(a.nonceOrHash).toBe(true);
    expect(a.verdict).toMatch(/^OK/);
  });

  it("reports report-only mode and a missing header", () => {
    expect(analyzeCsp("script-src 'self'", true).mode).toBe("report-only");
    expect(analyzeCsp(null).verdict).toBe("NO CSP HEADER");
  });
});

describe("verdict logic", () => {
  const clean = { status: 200, errors: [], pageErrors: [], cspViolations: [], failedRequests: [], badResponses: [] };

  it("a clean 200 passes", () => {
    expect(judge(clean)).toEqual([]);
  });

  it("a role wall passes only when it really returns the expected 403", () => {
    expect(judge({ ...clean, status: 403 }, 403)).toEqual([]);
    expect(judge({ ...clean, status: 200 }, 403)).toHaveLength(1); // wall is open: a security failure
  });

  it("every kind of runtime problem fails the URL", () => {
    expect(judge({ ...clean, errors: ["boom"] })).toHaveLength(1);
    expect(judge({ ...clean, pageErrors: ["x"] })).toHaveLength(1);
    expect(judge({ ...clean, cspViolations: ["x"] })).toHaveLength(1);
    expect(judge({ ...clean, failedRequests: ["x"] })).toHaveLength(1);
    expect(judge({ ...clean, badResponses: ["500 GET /api/x"] })).toHaveLength(1);
    expect(judge({ ...clean, status: 500 })).toHaveLength(1);
  });
});
