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

console.log("\n✅ Security check passed: Production environment is secure.\n");
process.exit(0);

