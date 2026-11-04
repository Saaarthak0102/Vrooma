/**
 * scripts/db-push.mjs
 *
 * Fail-Closed Guarded Database Push Runner for Vrooma.
 * Enforces:
 *   1. Required DEV project reference must be strictly 'eobtzcwinjmimzisypca'.
 *   2. Rejects old/deleted project refs ('ajumkjokagqfdikfguti', 'gmyrehlrmifxckszrdje').
 *   3. Rejects any production environment execution.
 *   4. Verified DEV reference must match SUPABASE_PROJECT_REF in environment.
 *   5. Verified DEV reference must match NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *   6. Verified DEV reference must match actual linked CLI project in supabase/.temp/project-ref.
 *   7. Rejects push if linked project state is missing or mismatched.
 *   8. Requires explicit confirmation flag --yes.
 *
 * Usage:
 *   SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca node scripts/db-push.mjs --yes
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const EXPECTED_DEV_PROJECT_REF = "eobtzcwinjmimzisypca";
export const FORBIDDEN_PROJECT_REFS = new Set([
  "ajumkjokagqfdikfguti",
  "gmyrehlrmifxckszrdje",
]);

/**
 * Validates database push configuration safely and deterministically.
 * @param {object} [options]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {string} [options.cwd]
 * @param {string[]} [options.args]
 * @param {string | null} [options.linkedRefOverride]
 * @returns {{ ok: boolean, error?: string, expectedRef?: string, providedRef?: string, linkedRef?: string }}
 */
export function validatePushConfiguration({
  env = process.env,
  cwd = process.cwd(),
  args = process.argv.slice(2),
  linkedRefOverride = null,
} = {}) {
  // 1. Guard against production environment
  const appEnv = env.APP_ENV || "";
  const nodeEnv = env.NODE_ENV || "";
  if (appEnv.toLowerCase() === "production" || nodeEnv.toLowerCase() === "production") {
    return {
      ok: false,
      error: "BLOCKED: Pushing migrations in a production environment is strictly forbidden.",
    };
  }

  // 2. Validate provided environment project reference
  const providedRef = (env.SUPABASE_PROJECT_REF || env.PROJECT_REF || "").trim();
  if (!providedRef) {
    return {
      ok: false,
      error: `BLOCKED: SUPABASE_PROJECT_REF environment variable is not set. Expected: ${EXPECTED_DEV_PROJECT_REF}`,
    };
  }

  if (FORBIDDEN_PROJECT_REFS.has(providedRef)) {
    return {
      ok: false,
      error: `BLOCKED: Project reference '${providedRef}' is a forbidden historical/deleted reference. Target the active DEV project '${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  if (providedRef !== EXPECTED_DEV_PROJECT_REF) {
    return {
      ok: false,
      error: `BLOCKED: Provided project reference '${providedRef}' does not match expected DEV reference '${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  // 3. Validate .env.local configuration
  const envLocalPath = path.resolve(cwd, ".env.local");
  if (!fs.existsSync(envLocalPath)) {
    return {
      ok: false,
      error: "BLOCKED: .env.local file not found. Cannot verify target Supabase project configuration.",
    };
  }

  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  let envFileRef = null;
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      const url = trimmed.split("=")[1].replace(/["']/g, "").trim();
      const match = url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
      if (match && match[1]) {
        envFileRef = match[1];
      }
    }
  }

  if (!envFileRef) {
    return {
      ok: false,
      error: "BLOCKED: NEXT_PUBLIC_SUPABASE_URL is missing or invalid in .env.local.",
    };
  }

  if (envFileRef !== EXPECTED_DEV_PROJECT_REF) {
    return {
      ok: false,
      error: `BLOCKED: .env.local URL points to project '${envFileRef}', but DEV project must be '${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  // 4. Validate Supabase CLI local linked state
  let linkedRef = linkedRefOverride;
  if (!linkedRef) {
    const linkedRefPath = path.resolve(cwd, "supabase/.temp/project-ref");
    if (!fs.existsSync(linkedRefPath)) {
      return {
        ok: false,
        error: `BLOCKED: Supabase CLI linked project file (supabase/.temp/project-ref) not found. Run 'npx supabase link --project-ref ${EXPECTED_DEV_PROJECT_REF}' first.`,
      };
    }
    linkedRef = fs.readFileSync(linkedRefPath, "utf-8").trim();
  }

  if (linkedRef !== EXPECTED_DEV_PROJECT_REF) {
    return {
      ok: false,
      error: `BLOCKED: Supabase CLI is currently linked to '${linkedRef}', which DOES NOT MATCH expected DEV project '${EXPECTED_DEV_PROJECT_REF}'. Run 'npx supabase link --project-ref ${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  // 5. Require explicit confirmation flag
  const hasYes = args.includes("--yes");
  if (!hasYes) {
    return {
      ok: false,
      error: `BLOCKED: Missing confirmation flag --yes. Run with: SUPABASE_PROJECT_REF=${EXPECTED_DEV_PROJECT_REF} pnpm db:push --yes`,
    };
  }

  // 6. Reject any unauthorized user arguments attempting to hijack target or CLI behavior
  const unauthorizedFlag = args.find((arg) =>
    arg.startsWith("--remote") ||
    arg.startsWith("--project-ref") ||
    arg.startsWith("--linked") ||
    arg.startsWith("--db-url")
  );
  if (unauthorizedFlag) {
    return {
      ok: false,
      error: `BLOCKED: Unauthorized CLI override flag '${unauthorizedFlag}'. Target project is strictly managed by db-push.mjs.`,
    };
  }

  return {
    ok: true,
    expectedRef: EXPECTED_DEV_PROJECT_REF,
    providedRef,
    linkedRef,
  };
}

export function buildPushArgs(projectRef = EXPECTED_DEV_PROJECT_REF) {
  if (FORBIDDEN_PROJECT_REFS.has(projectRef) || projectRef !== EXPECTED_DEV_PROJECT_REF) {
    throw new Error(`BLOCKED: Cannot construct push arguments for non-DEV project '${projectRef}'.`);
  }
  return ["supabase", "db", "push", `--remote=${projectRef}`, "--include-all"];
}

/**
 * Resolves the subprocess execution configuration for the current or specified platform.
 * @param {string} [platform=process.platform]
 * @param {string} [projectRef=EXPECTED_DEV_PROJECT_REF]
 * @returns {{ cmd: string, args: string[], options: { shell: boolean, stdio: "inherit" } }}
 */
export function getSpawnConfig(platform = process.platform, projectRef = EXPECTED_DEV_PROJECT_REF) {
  const isWindows = platform === "win32";
  return {
    cmd: isWindows ? "npx.cmd" : "npx",
    args: buildPushArgs(projectRef),
    options: {
      shell: isWindows,
      stdio: "inherit",
    },
  };
}

/**
 * Executes guarded database push runner.
 * @param {object} [options]
 * @param {(cmd: string, args: string[], options: any) => any} [options.spawner]
 * @param {(code?: number | string | null) => any} [options.exitHandler]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {string} [options.cwd]
 * @param {string[]} [options.args]
 * @param {string} [options.platform]
 * @param {string | null} [options.linkedRefOverride]
 * @returns {number | void}
 */
export function runPush({
  spawner = spawnSync,
  exitHandler = process.exit,
  env = process.env,
  cwd = process.cwd(),
  args = process.argv.slice(2),
  platform = process.platform,
  linkedRefOverride = null,
} = {}) {
  const result = validatePushConfiguration({ env, cwd, args, linkedRefOverride });

  console.log("\n=== VROOMA GUARDED DB PUSH ===");
  console.log(`Expected DEV project ref : ${EXPECTED_DEV_PROJECT_REF}`);
  console.log(`Provided project ref     : ${env.SUPABASE_PROJECT_REF || "(none)"}`);

  if (!result.ok) {
    console.error(`\n❌ ${result.error}\n`);
    return exitHandler(1);
  }

  console.log(`Linked CLI project ref   : ${result.linkedRef}`);
  console.log(`Confirmation flag (--yes): PRESENT`);
  console.log("\n✅ Safety checks passed. Initiating Supabase database migration push...\n");

  const spawnConfig = getSpawnConfig(platform, result.expectedRef);

  console.log(`Executing: ${spawnConfig.cmd} ${spawnConfig.args.join(" ")} (shell: ${spawnConfig.options.shell})`);

  const execution = spawner(spawnConfig.cmd, spawnConfig.args, {
    ...spawnConfig.options,
    env,
  });

  // 1. Handle subprocess invocation failure (e.g. spawn ENOENT, EINVAL)
  if (execution.error) {
    console.error(`\n❌ Failed to spawn Supabase CLI subprocess (${spawnConfig.cmd}): ${execution.error.message || execution.error}`);
    if (execution.error.code) {
      console.error(`Error code: ${execution.error.code}`);
    }
    return exitHandler(1);
  }

  // 2. Handle abnormal termination where process was killed or status is null
  if (execution.status === null) {
    console.error(`\n❌ Supabase CLI process terminated abnormally without an exit status (signal: ${execution.signal || "unknown"}).`);
    return exitHandler(1);
  }

  // 3. Handle non-zero exit codes from Supabase CLI
  if (execution.status !== 0) {
    console.error(`\n❌ Database push command failed with exit code ${execution.status}. Check the CLI error output above.`);
    return exitHandler(execution.status);
  }

  console.log("\n✅ Database migrations applied successfully!");
  return 0;
}

// Execute if run directly as CLI script
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
if (isMain) {
  runPush();
}
