import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { DEMO_LANDING, DEMO_PERSONAS, QUICK_LOGIN_PERSONAS, isDemoAddress, isDemoRole } from "@/lib/demo-personas";
import { DEV_TEST_USERS } from "@/../scripts/seed-dev-users";

describe("demo personas", () => {
  it("are the same accounts the DEV seed creates (ids, emails, roles, phones), so the two lists cannot drift", () => {
    for (const p of DEMO_PERSONAS) {
      const dev = DEV_TEST_USERS.find((u) => u.id === p.id);
      expect(dev, p.email).toBeTruthy();
      expect(dev).toMatchObject({ email: p.email, role: p.role, phone: p.phone });
      expect(dev?.showroom_id ?? undefined).toBe(p.showroomId);
    }
    expect(DEMO_PERSONAS).toHaveLength(9);
    expect(new Set(DEMO_PERSONAS.map((p) => p.id)).size).toBe(9);
  });

  it("offer one quick sign-in per user type, each landing on the right console", () => {
    expect(Object.keys(QUICK_LOGIN_PERSONAS).sort()).toEqual(["admin", "buyer", "consultant", "manager"]);
    for (const [role, persona] of Object.entries(QUICK_LOGIN_PERSONAS)) expect(persona.role).toBe(role);
    expect(DEMO_LANDING).toEqual({ buyer: "/dashboard", consultant: "/staff", manager: "/staff", admin: "/admin" });
    expect(isDemoRole("admin")).toBe(true);
    expect(isDemoRole("owner")).toBe(false);
    expect(isDemoRole(undefined)).toBe(false);
  });
});

describe("isDemoAddress: demo data is never emailed or messaged", () => {
  it.each([
    "dev-admin@vrooma.in",
    "DEV-Buyer@vrooma.in",
    "rohit.verma@vrooma.in",
    "demo.lead1@example.com",
    "someone@example.org",
    "x@sub.example.net",
    "a@mail.test",
    "a@nowhere.invalid",
    "a@localhost",
    "+919876500010",
    "+91 98765 00010",
    "+919001000012",
  ])("is a demo address: %s", (address) => {
    expect(isDemoAddress(address)).toBe(true);
  });

  it.each([
    "buyer@gmail.com",
    "saaarthak.codes@gmail.com",
    "notifications@mail.saaarthak.tech",
    "owner@vroomacars.vercel.app",
    "real.staff@vrooma.in", // the vrooma.in domain itself is not reserved: only the nine demo accounts are
    "someone@notexample.com",
    "+919876543210",
    "",
    null,
    undefined,
  ])("is not: %s", (address) => {
    expect(isDemoAddress(address as any)).toBe(false);
  });

  it("is enforced by the outbox worker before any provider call", () => {
    const route = fs.readFileSync("src/app/api/cron/outbox/route.ts", "utf8");
    const demoAt = route.indexOf("isDemoAddress(recipient)");
    expect(demoAt).toBeGreaterThan(-1);
    expect(demoAt).toBeLessThan(route.indexOf("deliverMessage(msg.channel"));
    expect(route).toContain("demo data is never emailed");
  });
});
