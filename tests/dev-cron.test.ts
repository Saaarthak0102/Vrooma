import { describe, it, expect } from "vitest";
import { resolveDevCronConfig as resolveRaw, runOnce, CRON_ROUTES } from "../scripts/dev-cron.mjs";

type Cfg = { ok: boolean; baseUrl?: string; error?: string; secret?: string };
const resolveDevCronConfig = resolveRaw as unknown as (env: Record<string, string>) => Cfg;

describe("dev-cron safety guards", () => {
  const base = { CRON_SECRET: "dev-secret", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };

  it("runs against localhost with a secret", () => {
    const cfg = resolveDevCronConfig({ ...base, APP_ENV: "development" });
    expect(cfg.ok).toBe(true);
    expect(cfg.baseUrl).toBe("http://localhost:3000");
  });

  it("refuses when APP_ENV is production", () => {
    const cfg = resolveDevCronConfig({ ...base, APP_ENV: "production" });
    expect(cfg.ok).toBe(false);
    expect(cfg.error).toMatch(/production/i);
  });

  it("refuses a non-localhost URL, including look-alike hosts", () => {
    for (const url of ["https://vrooma.in", "https://localhost.evil.com", "http://10.0.0.5:3000", "http://eobtzcwinjmimzisypca.supabase.co"]) {
      const cfg = resolveDevCronConfig({ ...base, APP_ENV: "development", DEV_CRON_BASE_URL: url });
      expect(cfg.ok, url).toBe(false);
    }
  });

  it("accepts 127.0.0.1 and [::1]", () => {
    expect(resolveDevCronConfig({ ...base, DEV_CRON_BASE_URL: "http://127.0.0.1:3000" }).ok).toBe(true);
    expect(resolveDevCronConfig({ ...base, DEV_CRON_BASE_URL: "http://[::1]:3000" }).ok).toBe(true);
  });

  it("refuses without CRON_SECRET", () => {
    expect(resolveDevCronConfig({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).ok).toBe(false);
  });

  it("calls outbox and sla with the bearer secret", async () => {
    const calls: { url: string; auth: string | null }[] = [];
    const fakeFetch = async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, auth: init.headers.Authorization });
      return { status: 200, text: async () => "{}" } as unknown as Response;
    };
    const results = await runOnce({ baseUrl: "http://localhost:3000", secret: "s" }, fakeFetch as never);
    expect(calls.map((c) => c.url)).toEqual(CRON_ROUTES.map((r: string) => `http://localhost:3000${r}`));
    expect(calls.every((c) => c.auth === "Bearer s")).toBe(true);
    expect(results.every((r: { status: number }) => r.status === 200)).toBe(true);
  });
});
