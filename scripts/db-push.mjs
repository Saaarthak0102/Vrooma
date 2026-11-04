/**
 * scripts/db-push.mjs
 *
 * Guarded database push runner for Vrooma.
 * Enforces:
 *   1. Refuses to push unless SUPABASE_PROJECT_REF matches the DEV project ref in .env.local.
 *   2. Refuses to push unless explicit confirmation flag --yes is supplied.
 *
 * Usage:
 *   SUPABASE_PROJECT_REF=ajumkjokagqfdikfguti node scripts/db-push.mjs --yes
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function loadEnvDevRef() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local not found. Cannot determine DEV project ref.");
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      const url = trimmed.split("=")[1].replace(/["']/g, "").trim();
      const match = url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL missing or invalid in .env.local.");
  process.exit(1);
}

function main() {
  const expectedDevRef = loadEnvDevRef();
  const providedRef = process.env.SUPABASE_PROJECT_REF || process.env.PROJECT_REF;
  const args = process.argv.slice(2);
  const hasYes = args.includes("--yes");

  console.log(`\n=== VROOMA GUARDED DB PUSH ===`);
  console.log(`Expected DEV project ref : ${expectedDevRef}`);
  console.log(`Provided project ref     : ${providedRef || "(none)"}`);
  console.log(`Confirmation flag (--yes): ${hasYes ? "PRESENT" : "MISSING"}\n`);

  if (!providedRef) {
    console.error("❌ BLOCKED: SUPABASE_PROJECT_REF environment variable is not set.");
    console.error(`Pass: SUPABASE_PROJECT_REF=${expectedDevRef} pnpm db:push --yes\n`);
    process.exit(1);
  }

  if (providedRef !== expectedDevRef) {
    console.error(`❌ BLOCKED: Provided project ref "${providedRef}" DOES NOT MATCH DEV project ref "${expectedDevRef}".`);
    console.error("Pushes to non-dev or production environments are strictly blocked by policy.\n");
    process.exit(1);
  }

  if (!hasYes) {
    console.error("❌ BLOCKED: Missing confirmation flag --yes.");
    console.error(`Run with: SUPABASE_PROJECT_REF=${expectedDevRef} pnpm db:push --yes\n`);
    process.exit(1);
  }

  console.log("✅ Safety checks passed. Initiating Supabase database migration push...");

  try {
    // Attempt push via Supabase CLI
    execSync("npx supabase db push --linked", { stdio: "inherit" });
    console.log("\n✅ Database migrations applied successfully!");
  } catch (err) {
    console.error("\n❌ Database push command failed. Verify Supabase CLI authentication and database link.");
    process.exit(1);
  }
}

main();

