#!/usr/bin/env node

/**
 * scripts/check-env.mjs
 *
 * CI and Deployment verification script.
 * Enforces that ALLOW_DEV_LOGIN is strictly disabled whenever deploying to production.
 *
 * Exits with 1 if ALLOW_DEV_LOGIN === 'true' when APP_ENV === 'production' or NODE_ENV === 'production'.
 */

import fs from "node:fs";
import path from "node:path";

const PROD_REF = process.env.SUPABASE_PROD_REF || "ajumkjokagqfdikfguti";

// 1. Check for forbidden .env.production* files
const filesInRoot = fs.readdirSync(process.cwd());
const prodEnvFiles = filesInRoot.filter((f) => f.startsWith(".env.production"));
if (prodEnvFiles.length > 0) {
  console.error("\n❌ FATAL SECURITY VIOLATION: Production env file found on disk:");
  console.error(` Found: ${prodEnvFiles.join(", ")}`);
  console.error(" Real production secrets must live in hosting platform env settings only.\n");
  process.exit(1);
}

// 2. Check that .env.local does not contain PROD ref in URLs or keys
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const val = rest.join("=").trim().replace(/["']/g, "");
    if (key !== "SUPABASE_PROD_REF" && val.includes(PROD_REF)) {
      console.error("\n❌ FATAL SECURITY VIOLATION: .env.local contains production project reference!");
      console.error(` Key '${key}' references production ref '${PROD_REF}'.`);
      console.error(" .env.local must strictly contain DEV credentials only.\n");
      process.exit(1);
    }
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

// Load env files in priority order
const fileEnv = {
  ...loadEnvFile(path.resolve(process.cwd(), ".env")),
  ...loadEnvFile(path.resolve(process.cwd(), ".env.production")),
  ...loadEnvFile(path.resolve(process.cwd(), ".env.local")),
};

const appEnv = process.env.APP_ENV || fileEnv.APP_ENV || "development";
const nodeEnv = process.env.NODE_ENV || fileEnv.NODE_ENV || "development";
const allowDevLogin = (process.env.ALLOW_DEV_LOGIN ?? fileEnv.ALLOW_DEV_LOGIN) === "true";

console.log("==================================================");
console.log("       VROOMA DEPLOYMENT SECURITY ENVIRONMENT CHECK");
console.log("==================================================");
console.log(` APP_ENV:         ${appEnv}`);
console.log(` NODE_ENV:        ${nodeEnv}`);
console.log(` ALLOW_DEV_LOGIN: ${allowDevLogin}`);

if ((appEnv === "production" || nodeEnv === "production") && allowDevLogin) {
  console.error("\n❌ FATAL SECURITY VIOLATION:");
  console.error(" ALLOW_DEV_LOGIN is enabled for a production target.");
  console.error(" Development backdoors must be disabled before deploying to production.\n");
  process.exit(1);
}

// 3. A production target must carry every required variable (values come from the hosting platform's env).
// CI sets SKIP_ENV_VALIDATION=1 (it only proves the dev-login backdoor is off); a real deploy check leaves it unset.
if (appEnv === "production" && process.env.SKIP_ENV_VALIDATION !== "1") {
  const get = (k) => process.env[k] ?? fileEnv[k] ?? "";
  const required = [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "CRON_SECRET",
    "RESEND_API_KEY",
    "TRUSTED_PROXY",
  ];
  const missing = required.filter((k) => !get(k));
  if (/localhost|127\.0\.0\.1/.test(get("NEXT_PUBLIC_SITE_URL"))) missing.push("NEXT_PUBLIC_SITE_URL (must not be localhost)");
  if (!process.env.SUPABASE_PROD_REF) {
    console.warn(" SUPABASE_PROD_REF is not set: the production-ref guard above used its built-in default.");
  }
  if (missing.length > 0) {
    console.error("\n❌ MISSING PRODUCTION ENVIRONMENT VARIABLES:");
    for (const k of missing) console.error(` - ${k}`);
    console.error("");
    process.exit(1);
  }
}

console.log("\n✅ Security check passed: Production environment is secure.\n");
process.exit(0);

