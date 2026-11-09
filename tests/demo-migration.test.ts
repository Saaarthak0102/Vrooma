import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MIGRATION_FILE, REFERENCE_NOW, REMOVE_FILE, buildDemoMigrationSql, buildRemoveDemoSql } from "@/../scripts/build-demo-migration";
import { DEMO_PERSONAS } from "@/lib/demo-personas";

const seed = fs.readFileSync("supabase/seed.sql", "utf8");
const committed = fs.readFileSync(MIGRATION_FILE, "utf8").replace(/\r\n/g, "\n");
const generated = buildDemoMigrationSql(seed);

/** The part of the file inside private.refresh_demo_activity(). */
const fnBody = generated.slice(generated.indexOf("AS $demo$"), generated.indexOf("$demo$;"));

describe("0042_demo_data.sql", () => {
  it("is exactly what the generator produces from the current sources (regenerate if this fails)", () => {
    expect(committed).toBe(generated);
  });

  it("is deterministic: building twice gives the same text", () => {
    expect(buildDemoMigrationSql(seed)).toBe(generated);
    expect(REFERENCE_NOW.toISOString()).toBe("2026-11-09T10:00:00.000Z");
  });

  it("is the single next migration after 0041, with no gap and no duplicate number", () => {
    const files = fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
    const numbers = files.map((f) => Number(f.slice(0, 4)));
    expect(path.basename(MIGRATION_FILE)).toBe("0042_demo_data.sql");
    expect(numbers.filter((n) => n === 42)).toHaveLength(1);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(42);
    expect(numbers.slice(0, 42)).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it("is wrapped in exactly one BEGIN/COMMIT pair (the repo's migration rule); the catalog seed's own pair is stripped", () => {
    expect(generated.match(/^\s*BEGIN\s*;/gim)).toHaveLength(1);
    expect(generated.match(/^\s*COMMIT\s*;/gim)).toHaveLength(1);
    expect(generated).not.toMatch(/^\s*ROLLBACK\s*;/im);
    const code = generated.split("\n").filter((l) => !l.trim().startsWith("--") && l.trim() !== "");
    expect(code[0]).toBe("BEGIN;");
    expect(code[code.length - 1]).toBe("COMMIT;");
  });

  it("is safe to run twice: every insert resolves conflicts instead of failing", () => {
    // every top-level INSERT statement (up to its terminating semicolon) carries an ON CONFLICT clause
    const statements = generated.split(/;\s*\n/).filter((s) => /^\s*(--[^\n]*\n\s*)*INSERT INTO/m.test(s));
    expect(statements.length).toBeGreaterThan(20);
    for (const s of statements) {
      expect(s, s.slice(0, 80)).toMatch(/ON CONFLICT/);
    }
  });

  it("creates exactly the nine demo accounts, with no password and no real-looking credentials", () => {
    for (const p of DEMO_PERSONAS) {
      expect(generated).toContain(`'${p.id}'`);
      expect(generated).toContain(`'${p.email}'`);
    }
    expect(generated).not.toMatch(/VroomaDevPass/i);
    expect(generated).not.toMatch(/crypt\(/i);
    // token columns are empty strings, never NULL (the Auth service cannot read NULL there)
    expect(generated).toMatch(/confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current/);
    expect(generated).toContain("'authenticated', 'authenticated'");
  });

  it("never names the production, retired or legacy projects", () => {
    for (const ref of ["zdasktnbdjkjtoncojsy", "ajumkjokagqfdikfguti", "gmyrehlrmifxckszrdje"]) {
      expect(generated).not.toContain(ref);
    }
  });

  it("only touches demo rows when refreshing: every delete is limited to ids starting 5eed", () => {
    const deletes = fnBody.match(/DELETE FROM [^\n]+/g) ?? [];
    expect(deletes.length).toBeGreaterThanOrEqual(15);
    for (const d of deletes) expect(d).toContain("id::text LIKE '5eed%'");
    // every row the function inserts has a 5eed id
    const ids = [...fnBody.matchAll(/^\s+\('([0-9a-f]{8})-/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(100);
    expect(ids.every((id) => id.startsWith("5eed"))).toBe(true);
  });

  it("is a locked-down function: empty search_path, schema-qualified tables, admin-only execution", () => {
    expect(generated).toContain("SECURITY DEFINER");
    expect(generated).toContain("SET search_path = ''");
    expect(generated).toContain("REVOKE ALL ON FUNCTION private.refresh_demo_activity() FROM PUBLIC, anon, authenticated;");
    expect(generated).toContain("GRANT EXECUTE ON FUNCTION private.refresh_demo_activity() TO service_role;");
    for (const m of fnBody.matchAll(/(?:INSERT INTO|DELETE FROM)\s+([a-z_.]+)/g)) {
      expect(m[1], m[0]).toMatch(/^public\./);
    }
    expect(fnBody).not.toMatch(/[^_.]\bnow\(\)/); // pg_catalog.now() only
  });

  it("seeds no outbox rows (demo data must never queue a message) and no passwords", () => {
    expect(fnBody).not.toContain("messages_outbox");
    expect(generated).not.toMatch(/INSERT INTO public\.messages_outbox/);
  });

  it("puts demo slots on business-hour half-hours, never on the hourly grid the generator uses", () => {
    const starts = [...fnBody.matchAll(/interval '(-?\d+) days (\d+) hours 30 minutes'/g)].map((m) => Number(m[2]));
    expect(starts.length).toBe(24); // 12 slots; each start expression is repeated inside its own end time
    for (const hour of starts) {
      expect(hour).toBeGreaterThanOrEqual(10);
      expect(hour).toBeLessThanOrEqual(17);
    }
  });

  it("ends by creating the next 14 days of slots, so booking works straight away", () => {
    expect(generated.trimEnd().endsWith("14);\n\nCOMMIT;")).toBe(true);
    expect(generated).toContain("SELECT private.refresh_demo_activity();");
  });

  it("uses the buyer-facing demo contact details on reserved example.com addresses (never a real mailbox)", () => {
    const emails = [...fnBody.matchAll(/'([^'@\s]+@[^'\s]+)'/g)].map((m) => m[1]);
    expect(emails.length).toBeGreaterThan(10);
    for (const e of emails) expect(e, e).toMatch(/@(example\.com|vrooma\.in)$/);
  });
});

describe("supabase/remove-demo-data.sql", () => {
  const removal = buildRemoveDemoSql();

  it("is exactly what the generator produces, and is NOT a migration (it never runs by itself)", () => {
    expect(fs.readFileSync(REMOVE_FILE, "utf8").replace(/\r\n/g, "\n")).toBe(removal);
    expect(REMOVE_FILE.startsWith("supabase/migrations/")).toBe(false);
    expect(fs.readdirSync("supabase/migrations").some((f) => f.includes("remove-demo"))).toBe(false);
  });

  it("removes only demo rows: 5eed ids, the nine demo accounts and the refresh function", () => {
    const deletes = removal.match(/^DELETE FROM [^\n]+/gm) ?? [];
    expect(deletes.length).toBe(16);
    for (const d of deletes.filter((d) => d.includes("public."))) expect(d).toContain("id::text LIKE '5eed%'");
    for (const p of DEMO_PERSONAS) expect(removal).toContain(`'${p.id}'`);
    expect(removal).toContain("DROP FUNCTION IF EXISTS private.refresh_demo_activity();");
  });

  it("keeps the catalog (it never deletes cars, prices, showrooms or offers) and runs in one transaction", () => {
    for (const table of ["used_cars", "models", "variants", "price_rules", "showrooms", "workshops", "offers", "banners", "cities"]) {
      expect(removal).not.toContain(`DELETE FROM public.${table} `);
    }
    expect(removal).toMatch(/^BEGIN;$/m);
    expect(removal).toMatch(/^COMMIT;$/m);
  });
});
