import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { maskRegNo, maskPhone } from "../src/lib/masking";

/**
 * Exact JavaScript simulation of PostgreSQL `private.mask_reg_number(reg TEXT)`
 * as defined in supabase/migrations/0005_used_cars.sql:
 *
 *   IF reg IS NULL OR reg = '' THEN
 *     RETURN '';
 *   END IF;
 *   clean := pg_catalog.regexp_replace(pg_catalog.upper(reg), '[^A-Z0-9]', '', 'g');
 *   len := pg_catalog.length(clean);
 *   IF len < 8 THEN
 *     RETURN clean;
 *   END IF;
 *   RETURN pg_catalog.substr(clean, 1, 4) || ' ** **** ' || pg_catalog.substr(clean, len - 3);
 */
function sqlMaskRegNumber(reg: string | null | undefined): string {
  if (reg === null || reg === undefined || reg === "") {
    return "";
  }
  const clean = reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const len = clean.length;
  if (len < 8) {
    return clean;
  }
  // PostgreSQL 1-based indexing:
  // substr(clean, 1, 4) -> slice(0, 4)
  // substr(clean, len - 3) -> 1-based index (len - 3) corresponds to 0-based index (len - 4) -> slice(-4)
  const part1 = clean.slice(0, 4);
  const part2 = clean.slice(-4);
  return `${part1} ** **** ${part2}`;
}

describe("masking utilities for DPDP compliance (Application Layer)", () => {
  it("masks Indian registration numbers per specification", () => {
    expect(maskRegNo("UP32AB1234")).toBe("UP32 ** **** 1234");
    expect(maskRegNo("UP-32-CD-5678")).toBe("UP32 ** **** 5678");
    expect(maskRegNo("up32ef9999")).toBe("UP32 ** **** 9999");
    expect(maskRegNo("UP321234")).toBe("UP32 ** **** 1234");
  });

  it("handles null, empty or short reg numbers safely", () => {
    expect(maskRegNo(null)).toBe("UP32 ** **** ****");
    expect(maskRegNo(undefined)).toBe("UP32 ** **** ****");
    expect(maskRegNo("")).toBe("UP32 ** **** ****");
    expect(maskRegNo("UP32")).toBe("UP32 ** **** ****");
    expect(maskRegNo("DL01")).toBe("UP32 ** **** ****");
    expect(maskRegNo("KA05A")).toBe("UP32 ** **** ****");
  });

  it("masks phone numbers safely", () => {
    expect(maskPhone("9876543210")).toBe("******3210");
    expect(maskPhone("+919876543210")).toBe("+91 ******3210");
    expect(maskPhone(null)).toBe("******0000");
    expect(maskPhone(undefined)).toBe("******0000");
    expect(maskPhone("123")).toBe("****");
  });
});

describe("PostgreSQL private.mask_reg_number() database function specification", () => {
  it("returns empty string for NULL and empty input", () => {
    expect(sqlMaskRegNumber(null)).toBe("");
    expect(sqlMaskRegNumber(undefined)).toBe("");
    expect(sqlMaskRegNumber("")).toBe("");
  });

  it("returns cleaned uppercase string for short registration numbers (< 8 alphanumeric chars)", () => {
    expect(sqlMaskRegNumber("UP32")).toBe("UP32");
    expect(sqlMaskRegNumber("up32")).toBe("UP32");
    expect(sqlMaskRegNumber("DL-01-A")).toBe("DL01A");
    expect(sqlMaskRegNumber("mh-02-1")).toBe("MH021");
    expect(sqlMaskRegNumber("1234567")).toBe("1234567");
  });

  it("masks standard Indian registration numbers (>= 8 alphanumeric chars)", () => {
    expect(sqlMaskRegNumber("UP32BC4120")).toBe("UP32 ** **** 4120");
    expect(sqlMaskRegNumber("up32bc4120")).toBe("UP32 ** **** 4120");
    expect(sqlMaskRegNumber("UP-32-BC-4120")).toBe("UP32 ** **** 4120");
    expect(sqlMaskRegNumber("DL 01 AB 1234")).toBe("DL01 ** **** 1234");
    expect(sqlMaskRegNumber("HR26DK8392")).toBe("HR26 ** **** 8392");
    expect(sqlMaskRegNumber("UP321234")).toBe("UP32 ** **** 1234");
  });
});

describe("SQL Migration 0005 & 0008 Syntax & Security Audit", () => {
  const mig0005Path = resolve(__dirname, "../supabase/migrations/0005_used_cars.sql");
  const mig0005Sql = readFileSync(mig0005Path, "utf-8");

  const mig0008Path = resolve(__dirname, "../supabase/migrations/0008_messaging_audit_ops.sql");
  const mig0008Sql = readFileSync(mig0008Path, "utf-8");

  it("0005 uses standard pg_catalog.substr function call syntax instead of invalid pg_catalog.substring(... FROM ...)", () => {
    expect(mig0005Sql).toContain("pg_catalog.substr(clean, 1, 4)");
    expect(mig0005Sql).toContain("pg_catalog.substr(clean, len - 3)");
    expect(mig0005Sql).not.toMatch(/pg_catalog\.substring\s*\(/i);
    expect(mig0005Sql).not.toMatch(/substring\s*\([^)]*FROM/i);
  });

  it("0005 private.mask_reg_number is marked IMMUTABLE SECURITY DEFINER with empty search_path", () => {
    expect(mig0005Sql).toMatch(
      /CREATE OR REPLACE FUNCTION private\.mask_reg_number[\s\S]*?LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = ''/i
    );
  });

  it("0005 used_cars year check constraint is strictly immutable (no NOW() or EXTRACT)", () => {
    expect(mig0005Sql).toContain("year INT NOT NULL CHECK (year >= 2000 AND year <= 2100)");
    expect(mig0005Sql).not.toMatch(/year\s+INT[\s\S]*?EXTRACT\(YEAR FROM NOW\(\)\)/i);
  });

  it("0005 check_used_car_transition trigger function has SECURITY DEFINER and empty search_path", () => {
    expect(mig0005Sql).toMatch(
      /CREATE OR REPLACE FUNCTION private\.check_used_car_transition[\s\S]*?LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''/i
    );
  });

  it("0008 trade_in_requests year check constraint is strictly immutable", () => {
    expect(mig0008Sql).toContain("year INT NOT NULL CHECK (year >= 2000 AND year <= 2100)");
    expect(mig0008Sql).not.toMatch(/EXTRACT\(YEAR FROM NOW\(\)\)/i);
  });

  it("0008 hit_rate_limit uses standard pg_catalog.date_part instead of schema-qualified extract with FROM", () => {
    expect(mig0008Sql).toContain("pg_catalog.date_part('epoch', pg_catalog.now())");
    expect(mig0008Sql).not.toMatch(/pg_catalog\.extract\s*\(/i);
  });
});
