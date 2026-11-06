import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnv = vi.hoisted(() => ({ APP_ENV: "production", CRON_SECRET: "" }));
vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { authorizeCron, DEV_CRON_SECRET } from "@/lib/cron-auth";

const req = (token?: string) =>
  new Request("http://localhost:3000/api/cron/outbox", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

describe("authorizeCron secret policy", () => {
  beforeEach(() => {
    mockEnv.APP_ENV = "production";
    mockEnv.CRON_SECRET = "";
  });

  it("production without CRON_SECRET fails closed and does NOT accept the known dev default", async () => {
    const res = authorizeCron(req(DEV_CRON_SECRET));
    expect(res?.status).toBe(503);
  });

  it("production with CRON_SECRET accepts only the exact secret", () => {
    mockEnv.CRON_SECRET = "s3cret-value-for-prod";
    expect(authorizeCron(req("s3cret-value-for-prod"))).toBeNull();
    expect(authorizeCron(req("s3cret-value-for-pro"))?.status).toBe(401);
    expect(authorizeCron(req(DEV_CRON_SECRET))?.status).toBe(401);
    expect(authorizeCron(req())?.status).toBe(401);
  });

  it("development without CRON_SECRET accepts the local default so pnpm dev works", () => {
    mockEnv.APP_ENV = "development";
    expect(authorizeCron(req(DEV_CRON_SECRET))).toBeNull();
    expect(authorizeCron(req("wrong"))?.status).toBe(401);
  });

  it("development with a configured CRON_SECRET no longer accepts the default", () => {
    mockEnv.APP_ENV = "development";
    mockEnv.CRON_SECRET = "configured-dev-secret";
    expect(authorizeCron(req(DEV_CRON_SECRET))?.status).toBe(401);
    expect(authorizeCron(req("configured-dev-secret"))).toBeNull();
  });
});
