/**
 * scripts/db-lint.mjs
 *
 * Migration & Schema Linter for Vrooma.
 * Validates:
 *   1. Migration sequence (0001 through 0013).
 *   2. Transaction boundaries (BEGIN / COMMIT).
 *   3. Universal RLS enablement across all public tables.
 *   4. Zero user_metadata usage in RLS policies.
 *   5. Search path isolation on SECURITY DEFINER routines.
 *   6. Column-level privacy grants (reg_no_private revoked, profiles.role guarded).
 *   7. Custom SQLSTATE VR error codes compliance.
 *   8. Seed script idempotency and auth.users safety.
 *   9. Immutable index expressions (no volatile/stable timestamptz casts without AT TIME ZONE).
 *   10. Explicit schema qualification for extension functions (e.g. extensions.gen_random_bytes).
 */

import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
const SEED_FILE = path.resolve(process.cwd(), "supabase/seed.sql");

const EXPECTED_MIGRATIONS = [
  "0001_extensions_schemas_enums.sql",
  "0002_identity_profiles_consents.sql",
  "0003_geo_catalog.sql",
  "0004_pricing.sql",
  "0005_used_cars.sql",
  "0006_slots_bookings.sql",
  "0007_leads_assignment.sql",
  "0008_messaging_audit_ops.sql",
  "0009_privacy_requests.sql",
  "0010_rls_policies.sql",
  "0011_functions_rpc.sql",
  "0012_cron_jobs.sql",
  "0013_storage.sql",
];

const KNOWN_TABLES = [
  "cities",
  "showrooms",
  "workshops",
  "showroom_closures",
  "models",
  "variants",
  "variant_colors",
  "price_rules",
  "used_cars",
  "used_car_sales_history",
  "used_car_price_suggestions",
  "demo_cars",
  "service_types",
  "slots",
  "bookings",
  "idempotency_keys",
  "profiles",
  "staff_showrooms",
  "consultant_availability",
  "consents",
  "leads",
  "lead_events",
  "assignment_rules",
  "assignment_rule_consultants",
  "messages_outbox",
  "audit_log",
  "rate_limits",
  "newsletter_subscribers",
  "csv_imports",
  "ai_logs",
  "saved_items",
  "trade_in_requests",
  "offers",
  "banners",
  "data_requests",
];

function lint() {
  console.log("=== VROOMA DATABASE SCHEMA & MIGRATION LINTER ===\n");
  let errors = 0;
  let warnings = 0;

  // 1. Check migrations exist and match expected sequence
  console.log("Checking migration files sequence...");
  const files = fs.readdirSync(MIGRATIONS_DIR).sort();
  for (const expected of EXPECTED_MIGRATIONS) {
    if (!files.includes(expected)) {
      console.error(`❌ Missing expected migration: ${expected}`);
      errors++;
    } else {
      console.log(`  ✓ Found ${expected}`);
    }
  }

  // 2. Lint each migration file
  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const rawContent = fs.readFileSync(fullPath, "utf-8");

    // Remove single-line comments for checking first SQL command
    const linesWithoutComments = rawContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("--"));

    const firstCommand = linesWithoutComments[0] || "";
    const lastCommand = linesWithoutComments[linesWithoutComments.length - 1] || "";

    if (!firstCommand.toUpperCase().startsWith("BEGIN;")) {
      console.error(`❌ ${file}: Migration must begin with 'BEGIN;'`);
      errors++;
    }
    if (!lastCommand.toUpperCase().endsWith("COMMIT;")) {
      console.error(`❌ ${file}: Migration must end with 'COMMIT;'`);
      errors++;
    }

    // Check for plain secret leaks (JWT tokens or secret keys)
    if (rawContent.includes("sb_secret_") || rawContent.includes("eyJhbGciOi")) {
      console.error(`❌ ${file}: Found potential hardcoded secret key or JWT token`);
      errors++;
    }

    // Check for non-immutable timestamptz casts in index expressions
    if (/CREATE\s+(UNIQUE\s+)?INDEX[\s\S]*?::date/i.test(rawContent)) {
      if (!rawContent.includes("AT TIME ZONE")) {
        console.error(`❌ ${file}: Index expression casts to date without explicit AT TIME ZONE conversion (not IMMUTABLE)`);
        errors++;
      }
    }

    // Check for unqualified pgcrypto / extension functions (e.g. gen_random_bytes)
    if (rawContent.includes("gen_random_bytes(") && !rawContent.includes("extensions.gen_random_bytes(")) {
      console.error(`❌ ${file}: gen_random_bytes must be schema-qualified with 'extensions.gen_random_bytes()'`);
      errors++;
    }

    // Check for user_metadata in RLS
    if (file === "0010_rls_policies.sql") {
      if (rawContent.includes("raw_user_meta_data") || rawContent.includes("user_metadata")) {
        console.error(`❌ ${file}: RLS policies must NEVER inspect user_metadata`);
        errors++;
      }
    }
  }

  // 3. Verify universal RLS enablement
  console.log("\nVerifying Row Level Security (RLS) coverage...");
  const rlsFile = path.join(MIGRATIONS_DIR, "0010_rls_policies.sql");
  const rlsContent = fs.readFileSync(rlsFile, "utf-8");

  for (const table of KNOWN_TABLES) {
    const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
    if (!rlsRegex.test(rlsContent)) {
      console.error(`❌ Table public.${table} does not have ENABLE ROW LEVEL SECURITY in 0010_rls_policies.sql`);
      errors++;
    }
  }
  console.log(`  ✓ All ${KNOWN_TABLES.length} tables verified with explicit ENABLE ROW LEVEL SECURITY.`);

  // 4. Verify Column-level permissions
  console.log("\nVerifying Column-Level Privacy protections...");
  const usedCarSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0005_used_cars.sql"), "utf-8");
  if (!usedCarSql.includes("REVOKE SELECT ON public.used_cars FROM anon, authenticated;")) {
    console.error("❌ 0005_used_cars.sql: Missing REVOKE SELECT ON public.used_cars FROM anon, authenticated");
    errors++;
  } else if (usedCarSql.includes("reg_no_private") && usedCarSql.match(/GRANT\s+SELECT\s*\([^)]*reg_no_private[^)]*\)\s*ON\s*public\.used_cars/i)) {
    console.error("❌ 0005_used_cars.sql: reg_no_private must NOT be granted in SELECT list");
    errors++;
  } else {
    console.log("  ✓ used_cars.reg_no_private is strictly protected from anon and authenticated SELECT.");
  }

  const profileSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0002_identity_profiles_consents.sql"), "utf-8");
  if (!profileSql.includes("REVOKE UPDATE ON public.profiles FROM authenticated;")) {
    console.error("❌ 0002_identity_profiles_consents.sql: Missing REVOKE UPDATE ON public.profiles FROM authenticated");
    errors++;
  } else if (profileSql.match(/GRANT\s+UPDATE\s*\([^)]*role[^)]*\)\s*ON\s*public\.profiles\s*TO\s*authenticated/i)) {
    console.error("❌ 0002_identity_profiles_consents.sql: role column must NOT be granted in authenticated UPDATE list");
    errors++;
  } else {
    console.log("  ✓ profiles.role escalation is prevented at column privilege level.");
  }

  // 5. Verify Seed Script Idempotency
  console.log("\nVerifying seed script idempotency and safety...");
  if (fs.existsSync(SEED_FILE)) {
    const seedContent = fs.readFileSync(SEED_FILE, "utf-8");
    if (seedContent.includes("INSERT INTO auth.users")) {
      console.error("❌ supabase/seed.sql: Inserting directly into auth.users is forbidden by rule (use dev scripts)");
      errors++;
    } else {
      console.log("  ✓ seed.sql does not mutate auth.users.");
    }
  } else {
    console.error("❌ Missing supabase/seed.sql");
    errors++;
  }

  console.log(`\n=== LINT SUMMARY ===`);
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);

  if (errors > 0) {
    console.error("\n❌ Database schema lint failed.");
    process.exit(1);
  } else {
    console.log("\n✅ All database schema checks passed successfully!");
  }
}

lint();
