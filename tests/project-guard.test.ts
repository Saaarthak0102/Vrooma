import { describe, it, expect } from "vitest";
import {
  DEV_REF,
  PROD_REF,
  extractProjectRef,
  validateEnvironmentSafety,
  assertSafeDevEnvironment,
} from "@/lib/project-guard";

describe("Project Guard (DEV vs PROD Safety)", () => {
  it("has correct canonical DEV and PROD refs", () => {
    expect(DEV_REF).toBe("eobtzcwinjmimzisypca");
    expect(PROD_REF).toBe("ajumkjokagqfdikfguti");
  });

  it("extracts project ref from full Supabase URLs and raw strings", () => {
    expect(extractProjectRef("https://eobtzcwinjmimzisypca.supabase.co")).toBe("eobtzcwinjmimzisypca");
    expect(extractProjectRef("https://ajumkjokagqfdikfguti.supabase.co")).toBe("ajumkjokagqfdikfguti");
    expect(extractProjectRef("eobtzcwinjmimzisypca")).toBe("eobtzcwinjmimzisypca");
    expect(extractProjectRef("")).toBeNull();
    expect(extractProjectRef(undefined)).toBeNull();
  });

  it("passes safe dev environment assertion for DEV ref", () => {
    expect(() => {
      assertSafeDevEnvironment("unit-test", "https://eobtzcwinjmimzisypca.supabase.co");
    }).not.toThrow();
  });

  it("strictly throws when dev assertions encounter production ref", () => {
    expect(() => {
      assertSafeDevEnvironment("unit-test", "https://ajumkjokagqfdikfguti.supabase.co");
    }).toThrow(/strictly forbidden from running against the PRODUCTION project ref/);
  });

  it("strictly throws when dev assertions encounter legacy forbidden ref", () => {
    expect(() => {
      assertSafeDevEnvironment("unit-test", "https://gmyrehlrmifxckszrdje.supabase.co");
    }).toThrow(/forbidden production or legacy reference/);
  });

  it("blocks production targeting when allowProd is false", () => {
    const res = validateEnvironmentSafety({
      scriptName: "seed-dev-users",
      allowProd: false,
      url: "https://ajumkjokagqfdikfguti.supabase.co",
      args: ["--i-am-targeting-production"],
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("strictly forbidden");
  });

  it("blocks production targeting when --i-am-targeting-production is missing", () => {
    const res = validateEnvironmentSafety({
      scriptName: "db-push",
      allowProd: true,
      url: "https://ajumkjokagqfdikfguti.supabase.co",
      args: [],
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("requires the explicit flag '--i-am-targeting-production'");
  });

  it("blocks production targeting when typed confirmation does not match", () => {
    const res = validateEnvironmentSafety({
      scriptName: "db-push",
      allowProd: true,
      url: "https://ajumkjokagqfdikfguti.supabase.co",
      args: ["--i-am-targeting-production"],
      confirmedRef: "wrong_ref",
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("Typed confirmation ref");
  });

  it("allows production targeting ONLY when allowProd=true, flag is present, and confirmation matches", () => {
    const res = validateEnvironmentSafety({
      scriptName: "db-push",
      allowProd: true,
      url: "https://ajumkjokagqfdikfguti.supabase.co",
      args: ["--i-am-targeting-production"],
      confirmedRef: "ajumkjokagqfdikfguti",
    });

    expect(res.ok).toBe(true);
    expect(res.target).toBe("prod");
    expect(res.resolvedRef).toBe("ajumkjokagqfdikfguti");
  });
});

