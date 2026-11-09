/**
 * scripts/build-demo-migration.ts
 *
 * Writes supabase/migrations/0042_demo_data.sql: the whole mock dataset as ONE idempotent migration, so the guarded
 * runner can put it on the production project together with the schema (the seed scripts refuse production by design).
 *
 * Nothing is typed twice. The migration is generated from the sources that already feed DEV:
 *   1. supabase/seed.sql                catalog: cities, showrooms, workshops, models, variants, demo cars, used cars,
 *                                       price rules, offers, banners, routing rules (its staff-placeholder section is
 *                                       replaced by step 2)
 *   2. src/lib/demo-personas.ts         the nine demo accounts (auth users, identities, profiles, showroom links)
 *   3. scripts/seed-ai-demo.ts          demo activity: leads, bookings, tasks, chats, garage, AI call log, call log
 *
 * Demo activity is time-relative ("a booking in 20 hours"), so it lives in private.refresh_demo_activity(), which the
 * migration runs once. Run it again (select private.refresh_demo_activity();) right before a demo to re-time everything.
 *
 *   node --experimental-strip-types scripts/build-demo-migration.ts            writes the file
 *   node --experimental-strip-types scripts/build-demo-migration.ts --check    fails if the committed file is stale
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAiDemoData, TABLE_ORDER } from "./seed-ai-demo.ts";
import { DEMO_PERSONAS } from "../src/lib/demo-personas.ts";

/** Fixed, so the output is identical on every machine and every run. All dates become offsets from this moment. */
export const REFERENCE_NOW = new Date("2026-11-09T10:00:00.000Z");
export const MIGRATION_FILE = "supabase/migrations/0042_demo_data.sql";

const IST_MS = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;
const istDate = (ms: number) => new Date(ms + IST_MS).toISOString().slice(0, 10);
const REF_IST_DAY = Date.parse(`${istDate(REFERENCE_NOW.getTime())}T00:00:00Z`);

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A timestamp as an offset from the moment the SQL runs. */
const tsExpr = (iso: string) => `pg_catalog.now() + interval '${Math.round((Date.parse(iso) - REFERENCE_NOW.getTime()) / 1000)} seconds'`;
/** A calendar date as an offset from today in India. */
const dateExpr = (d: string) => {
  const days = Math.round((Date.parse(`${d}T00:00:00Z`) - REF_IST_DAY) / DAY_MS);
  return `(pg_catalog.timezone('Asia/Kolkata', pg_catalog.now())::date + ${days})`;
};

type Row = Record<string, unknown>;
type Raw = string;
const raw = (sql: string): Raw => ({ __sql: sql }) as unknown as Raw;
const isRaw = (v: unknown): v is { __sql: string } => typeof v === "object" && v !== null && "__sql" in (v as object);

function literal(value: unknown): string {
  if (isRaw(value)) return value.__sql;
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (TS_RE.test(value)) return `(${tsExpr(value)})`;
    if (DATE_RE.test(value)) return dateExpr(value);
    return q(value);
  }
  return `${q(JSON.stringify(value))}::jsonb`;
}

function insertSql(table: string, rows: Row[], conflict = "ON CONFLICT (id) DO NOTHING"): string {
  if (rows.length === 0) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const values = rows.map((r) => `  (${cols.map((c) => (c in r ? literal(r[c]) : "DEFAULT")).join(", ")})`).join(",\n");
  return `INSERT INTO public.${table} (${cols.join(", ")}) VALUES\n${values}\n${conflict};`;
}

/**
 * Demo slots sit on business-hour half-hours (10:30 ... 17:30 India time), on a day counted from today, so nobody sees
 * "12:06 am". Half-hours can never clash with the hourly slots generate_slots creates. Two demo slots for the same
 * resource never share a start.
 */
function snapSlots(slots: Row[]): Row[] {
  const used = new Set<string>();
  return slots.map((slot) => {
    const start = Date.parse(String(slot.starts_at));
    const minutes = Math.round((Date.parse(String(slot.ends_at)) - start) / 60_000);
    const ist = new Date(start + IST_MS);
    const dayDiff = Math.round((Date.parse(`${istDate(start)}T00:00:00Z`) - REF_IST_DAY) / DAY_MS);
    let hour = Math.min(17, Math.max(10, ist.getUTCHours()));
    const resource = String(slot.demo_car_id ?? slot.workshop_id ?? slot.showroom_id);
    while (used.has(`${slot.kind}|${resource}|${dayDiff}|${hour}`) && hour < 17) hour++;
    used.add(`${slot.kind}|${resource}|${dayDiff}|${hour}`);
    const startExpr = `((pg_catalog.date_trunc('day', pg_catalog.timezone('Asia/Kolkata', pg_catalog.now())) + interval '${dayDiff} days ${hour} hours 30 minutes') AT TIME ZONE 'Asia/Kolkata')`;
    return { ...slot, starts_at: raw(startExpr), ends_at: raw(`(${startExpr} + interval '${minutes} minutes')`) };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. catalog (from supabase/seed.sql)
// ---------------------------------------------------------------------------------------------------------------------
const SEPARATOR = "-- =========================================================================";

function catalogSql(seed: string): { catalog: string; routing: string } {
  const text = seed.replace(/\r\n/g, "\n");
  const sec8 = text.indexOf("-- 8. STAFF PROFILE PLACEHOLDERS");
  const sec9 = text.indexOf("-- 9. LEAD ASSIGNMENT ROUTING RULES");
  if (sec8 < 0 || sec9 < 0) throw new Error("supabase/seed.sql no longer has sections 8 and 9 where the generator expects them.");
  const start8 = text.lastIndexOf(SEPARATOR, sec8);
  const start9 = text.lastIndexOf(SEPARATOR, sec9);
  const strip = (s: string) => s.replace(/^BEGIN;\s*$/gm, "").replace(/^COMMIT;\s*$/gm, "").trim();
  return { catalog: strip(text.slice(0, start8)), routing: strip(text.slice(start9)) };
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. demo accounts
// ---------------------------------------------------------------------------------------------------------------------
function personasSql(): string {
  const userRows = DEMO_PERSONAS.map(
    (p) =>
      `  ('00000000-0000-0000-0000-000000000000', ${q(p.id)}, 'authenticated', 'authenticated', ${q(p.email)}, '', pg_catalog.now(), '', '', '', '', '', '', '', '', ` +
      `'{"provider":"email","providers":["email"]}'::jsonb, ${q(JSON.stringify({ email_verified: true, full_name: p.fullName }))}::jsonb, false, false, pg_catalog.now(), pg_catalog.now())`,
  ).join(",\n");

  const identityRows = DEMO_PERSONAS.map(
    (p) =>
      `  (${q(p.id)}, ${q(p.id)}, ${q(JSON.stringify({ sub: p.id, email: p.email, email_verified: false, phone_verified: false }))}::jsonb, 'email', pg_catalog.now(), pg_catalog.now(), pg_catalog.now())`,
  ).join(",\n");

  const profileRows = DEMO_PERSONAS.map(
    (p) => `  (${q(p.id)}, ${q(p.email)}, ${q(p.fullName)}, ${q(p.phone)}, ${q(p.role)}, 'en', true, pg_catalog.now())`,
  ).join(",\n");

  const showroomRows = DEMO_PERSONAS.filter((p) => p.showroomId)
    .map((p) => `  (${q(p.id)}, ${q(p.showroomId!)}, true)`)
    .join(",\n");

  return `-- ---------------------------------------------------------------------------------------------------------------------
-- Demo accounts. No password and no real mailbox: they are signed in by /api/auth/demo-login (only when DEMO_LOGIN=true).
-- Every token column is '' (not NULL), exactly as the Auth service writes them. The auth.users trigger then creates a
-- buyer profile for each; the next statement sets the real role, phone and onboarding state.
-- ---------------------------------------------------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  reauthentication_token, phone_change, phone_change_token,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, created_at, updated_at
) VALUES
${userRows}
ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
${identityRows}
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, phone, role, locale, is_active, onboarding_completed_at) VALUES
${profileRows}
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = true,
  onboarding_completed_at = COALESCE(public.profiles.onboarding_completed_at, EXCLUDED.onboarding_completed_at);

INSERT INTO public.staff_showrooms (profile_id, showroom_id, is_primary) VALUES
${showroomRows}
ON CONFLICT (profile_id, showroom_id) DO NOTHING;`;
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. demo activity
// ---------------------------------------------------------------------------------------------------------------------
function activityFunctionSql(): string {
  const data = buildAiDemoData(REFERENCE_NOW);

  const used = (stock: unknown) => (stock ? raw(`(SELECT id FROM public.used_cars WHERE stock_id = ${q(String(stock))})`) : null);
  const resolved: Record<string, Row[]> = {
    ...(data as unknown as Record<string, Row[]>),
    slots: snapSlots(data.slots),
    leads: data.leads.map(({ used_car_stock_id, ...row }) => ({ ...row, used_car_id: used(used_car_stock_id) })),
    savedItems: data.savedItems.map(({ used_car_stock_id, ...row }) => ({ ...row, used_car_id: used(used_car_stock_id) })),
  };

  const deletes = [...TABLE_ORDER].reverse().map(([, table]) => `  DELETE FROM public.${table} WHERE id::text LIKE '5eed%';`);
  const inserts = TABLE_ORDER.map(([key, table]) => insertSql(table, resolved[key as string]).replace(/^/gm, "  ")).filter((s) => s.trim());

  return `-- ---------------------------------------------------------------------------------------------------------------------
-- Demo activity (leads, bookings, tasks, chats, garage cars, AI call log, call log). Every id starts with 5eed, so this
-- function can remove and re-create exactly its own rows and nothing else. All dates are offsets from the moment it
-- runs. Run it again right before a demo to make the screens fresh:  select private.refresh_demo_activity();
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.refresh_demo_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $demo$
BEGIN
  -- Remove the previous demo rows, children first.
${deletes.join("\n")}

  -- Insert them again, parents first.
${inserts.join("\n\n")}
END;
$demo$;

REVOKE ALL ON FUNCTION private.refresh_demo_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.refresh_demo_activity() TO service_role;`;
}

export function buildDemoMigrationSql(seedSql: string): string {
  const { catalog, routing } = catalogSql(seedSql);
  return `-- 0042_demo_data.sql
-- GENERATED by scripts/build-demo-migration.ts. Do not edit by hand: change the source (supabase/seed.sql,
-- src/lib/demo-personas.ts, scripts/seed-ai-demo.ts) and regenerate. A test fails if this file is stale.
--
-- All of Vrooma's mock data in ONE idempotent migration, so the guarded runner can load a demo environment:
--   1. catalog      cities, showrooms, workshops, models, variants, colours, demo cars, service types, used cars,
--                   sales history, price rules, offers, banners
--   2. accounts     the nine demo accounts (auth users, identities, profiles, showroom links, routing pools)
--   3. activity     leads, bookings, tasks, chats, garage cars, AI call log, via private.refresh_demo_activity()
--   4. slots        generate_slots() for the next 14 days, so booking works the moment this is applied
-- Every insert is ON CONFLICT DO NOTHING / DO UPDATE, so running it again, or on DEV where the data already exists,
-- changes nothing. It never sends anything: the outbox worker skips demo addresses.
-- To remove the demo data later, run supabase/remove-demo-data.sql.

BEGIN;

-- =====================================================================================================================
-- 1. CATALOG
-- =====================================================================================================================
${catalog}

-- =====================================================================================================================
-- 2. DEMO ACCOUNTS
-- =====================================================================================================================
${personasSql()}

-- =====================================================================================================================
-- 3. ROUTING RULES AND CONSULTANT POOLS (needs the accounts above)
-- =====================================================================================================================
${routing}

-- =====================================================================================================================
-- 4. DEMO ACTIVITY
-- =====================================================================================================================
${activityFunctionSql()}

SELECT private.refresh_demo_activity();

-- =====================================================================================================================
-- 5. SLOTS FOR THE NEXT 14 DAYS (idempotent; the daily cron keeps adding more)
-- =====================================================================================================================
SELECT public.generate_slots((pg_catalog.timezone('Asia/Kolkata', pg_catalog.now()))::date, 14);

COMMIT;
`;
}

export const REMOVE_FILE = "supabase/remove-demo-data.sql";

/** For the day the site goes live for real: removes the demo activity and the nine demo accounts. NOT a migration. */
export function buildRemoveDemoSql(): string {
  const deletes = [...TABLE_ORDER].reverse().map(([, table]) => `DELETE FROM public.${table} WHERE id::text LIKE '5eed%';`);
  const ids = DEMO_PERSONAS.map((p) => `  ${q(p.id)}`).join(",\n");
  return `-- ${path.basename(REMOVE_FILE)}
-- GENERATED by scripts/build-demo-migration.ts (do not edit by hand). NOT a migration: run it yourself, once, in the
-- Supabase SQL editor of the project you are cleaning, when the demo is over and real data begins.
--
-- Removes: the demo activity (every row whose id starts 5eed), the nine demo accounts (their profiles and showroom links
-- go with them) and the refresh function. Keeps: the catalog (cities, showrooms, workshops, models, variants, prices,
-- offers, banners, used cars), which you replace with real data in the admin console.
-- Also switch off the demo sign-in (remove DEMO_LOGIN and NEXT_PUBLIC_DEMO_LOGIN in the hosting settings and redeploy).

BEGIN;

${deletes.join("\n")}

DELETE FROM auth.users WHERE id IN (
${ids}
);

DROP FUNCTION IF EXISTS private.refresh_demo_activity();

COMMIT;
`;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main() {
  const seed = fs.readFileSync(path.join(ROOT, "supabase/seed.sql"), "utf8");
  const outputs: [string, string][] = [
    [MIGRATION_FILE, buildDemoMigrationSql(seed)],
    [REMOVE_FILE, buildRemoveDemoSql()],
  ];
  if (process.argv.includes("--check")) {
    let stale = false;
    for (const [file, sql] of outputs) {
      const target = path.join(ROOT, file);
      const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") : "";
      if (current !== sql) {
        console.error(`${file} is out of date. Run: node --experimental-strip-types scripts/build-demo-migration.ts`);
        stale = true;
      } else {
        console.log(`${file} is up to date.`);
      }
    }
    if (stale) process.exit(1);
    return;
  }
  for (const [file, sql] of outputs) {
    fs.writeFileSync(path.join(ROOT, file), sql, "utf8");
    console.log(`wrote ${file} (${sql.split("\n").length} lines)`);
  }
}

const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain && !process.env.VITEST) main();
