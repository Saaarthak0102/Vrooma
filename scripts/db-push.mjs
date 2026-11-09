/**
 * scripts/db-push.mjs
 *
 * Fail-closed, guarded database migration runner for Vrooma. One script, two explicit targets:
 *
 *   DEV         pnpm db:push --target dev --yes
 *   PRODUCTION  pnpm db:push --target prod --i-am-targeting-production --confirm-production=<prod ref> [--dry-run]
 *
 * Nothing is inferred and nothing is forwarded from the command line to the Supabase CLI. Every argument must be on
 * the allowlist of the chosen target, the project references are constants in this file (never read from the
 * environment), and every check below must pass before the CLI is started. The runner never re-links the CLI, never
 * edits files, and never bypasses the CLI's own migration-history check.
 *
 * DEV checks
 *   - SUPABASE_PROJECT_REF is the DEV ref; the production and the deleted legacy refs are rejected.
 *   - .env.local exists and its NEXT_PUBLIC_SUPABASE_URL is the DEV project.
 *   - supabase/.temp/project-ref (the CLI link) is the DEV ref.
 *   - APP_ENV / NODE_ENV is not "production".
 *   - --yes is present.
 *
 * PRODUCTION checks
 *   - --i-am-targeting-production, and --confirm-production=<ref> typed with the exact production ref (not needed
 *     for --dry-run, which still passes every other check).
 *   - SUPABASE_PROJECT_REF is the production ref (DEV, legacy and anything else are rejected).
 *   - NEXT_PUBLIC_SUPABASE_URL, taken from the operator's shell, is exactly the production project URL.
 *   - SUPABASE_DB_PASSWORD is set in the shell. It is never read from a file, never printed, and never passed as a
 *     command-line argument; it only reaches the CLI through the child process environment.
 *   - .env.local does not mention the production ref and does not define production credentials.
 *   - The CLI link (supabase/.temp/project-ref, and linked-project.json when present) is the production ref.
 *   - No database-URL style override is present in the environment.
 *   - --include-all is NOT used, so a migration older than the remote history is stopped by the CLI, not forced.
 *
 * After any production run, the CLI is still linked to production. Re-link to DEV before the next DEV push:
 *   npx supabase link --project-ref eobtzcwinjmimzisypca
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const EXPECTED_DEV_PROJECT_REF = "eobtzcwinjmimzisypca";
export const EXPECTED_PROD_PROJECT_REF = "zdasktnbdjkjtoncojsy";
export const LEGACY_DELETED_PROJECT_REF = "gmyrehlrmifxckszrdje";
/** The first production project, retired when the current one was created. It must never be targeted again. */
export const RETIRED_PROD_PROJECT_REF = "ajumkjokagqfdikfguti";
/** Refs that are never valid as a target in either mode: the deleted legacy DEV project and the retired production project. */
export const RETIRED_PROJECT_REFS = new Set([LEGACY_DELETED_PROJECT_REF, RETIRED_PROD_PROJECT_REF]);
/** Refs a DEV run must never touch (kept under its old name for existing imports). */
export const FORBIDDEN_PROJECT_REFS = new Set([EXPECTED_PROD_PROJECT_REF, ...RETIRED_PROJECT_REFS]);

export const PROD_PROJECT_URL = `https://${EXPECTED_PROD_PROJECT_REF}.supabase.co`;

/** Flags that try to choose or change the target: reported with one clear message. */
const OVERRIDE_FLAG_PREFIXES = [
  "--remote",
  "--project-ref",
  "--linked",
  "--local",
  "--db-url",
  "--password",
  "--workdir",
  "--include-all",
  "--include-roles",
  "--include-seed",
  "--profile",
  "--network-id",
];

/** Environment variables that could redirect the CLI to another database. A production run refuses to start with any set. */
const FORBIDDEN_PROD_ENV_VARS = [
  "SUPABASE_DB_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "SUPABASE_PROJECT_ID",
];

/** Credentials that must come from the shell only. */
const PROD_CREDENTIAL_NAMES = ["SUPABASE_DB_PASSWORD", "SUPABASE_ACCESS_TOKEN"];

const ALLOWED_FLAGS = {
  dev: new Set(["--target", "--yes", "--dry-run"]),
  prod: new Set(["--target", "--i-am-targeting-production", "--confirm-production", "--dry-run"]),
};

const blocked = (error) => ({ ok: false, error: `BLOCKED: ${error}` });

/**
 * Reads the arguments strictly. Returns the chosen target and flags, or an error.
 * @param {string[]} args
 */
export function parseArgs(args) {
  let target = null;
  const flags = new Set();
  let confirmValue = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const inlineValue = eq === -1 ? null : arg.slice(eq + 1);

    if (name === "-p" || OVERRIDE_FLAG_PREFIXES.some((p) => name === p || name.startsWith(`${p}`))) {
      return { error: `Unauthorized CLI override flag '${arg}'. Target project is strictly managed by db-push.mjs.` };
    }

    if (name === "--target") {
      const value = inlineValue ?? args[++i];
      if (value !== "dev" && value !== "prod") {
        return { error: `--target must be 'dev' or 'prod' (got '${value ?? ""}').` };
      }
      if (target && target !== value) return { error: "--target was given twice with different values." };
      target = value;
      flags.add("--target");
      continue;
    }

    if (name === "--confirm-production") {
      if (inlineValue === null) return { error: "--confirm-production needs the production project ref: --confirm-production=<ref>." };
      confirmValue = inlineValue;
      flags.add("--confirm-production");
      continue;
    }

    if (name === "--yes" || name === "--dry-run" || name === "--i-am-targeting-production") {
      if (inlineValue !== null) return { error: `Flag '${name}' does not take a value.` };
      flags.add(name);
      continue;
    }

    return { error: `Unknown argument '${arg}'. Only the documented flags are accepted.` };
  }

  if (!target) return { error: "Missing --target. Use --target dev or --target prod." };

  const allowed = ALLOWED_FLAGS[target];
  for (const flag of flags) {
    if (!allowed.has(flag)) {
      return { error: `Flag '${flag}' is not valid for --target ${target}.` };
    }
  }
  return { target, flags, confirmValue };
}

function refFromSupabaseUrl(url) {
  const match = String(url ?? "").trim().replace(/^["']|["']$/g, "").match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/);
  return match ? match[1] : null;
}

/** First NEXT_PUBLIC_SUPABASE_URL value in an env file's text, or null. */
function envFileUrl(content) {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) return trimmed.slice("NEXT_PUBLIC_SUPABASE_URL=".length);
  }
  return null;
}

/** The link the Supabase CLI keeps in supabase/.temp: the ref file and, when present, linked-project.json. */
function readLinkState(fsImpl, cwd, linkedRefOverride) {
  const refPath = path.resolve(cwd, "supabase/.temp/project-ref");
  let refFile = linkedRefOverride;
  if (!refFile) {
    if (!fsImpl.existsSync(refPath)) return { error: "missing" };
    refFile = String(fsImpl.readFileSync(refPath, "utf-8")).trim();
  }

  const jsonPath = path.resolve(cwd, "supabase/.temp/linked-project.json");
  let jsonRef = null;
  if (fsImpl.existsSync(jsonPath)) {
    try {
      jsonRef = String(JSON.parse(String(fsImpl.readFileSync(jsonPath, "utf-8"))).ref ?? "").trim() || null;
    } catch {
      return { error: "unreadable-json", refFile };
    }
  }
  return { refFile, jsonRef };
}

/**
 * Validates a push configuration for the target named in the arguments. Pure apart from reading the three small
 * files through `fsImpl`, so tests run it with an in-memory file system.
 * @param {object} [options]
 * @param {Record<string, string | undefined>} [options.env]
 * @param {string} [options.cwd]
 * @param {string[]} [options.args]
 * @param {string | null} [options.linkedRefOverride]
 * @param {{ existsSync: (p: string) => boolean, readFileSync: (p: string, enc: string) => string }} [options.fsImpl]
 * @returns {{ ok: boolean, error?: string, target?: "dev" | "prod", expectedRef?: string, providedRef?: string, linkedRef?: string | null, dryRun?: boolean }}
 */
export function validatePushConfiguration({
  env = process.env,
  cwd = process.cwd(),
  args = process.argv.slice(2),
  linkedRefOverride = null,
  fsImpl = fs,
} = {}) {
  const parsed = parseArgs(args);
  if (parsed.error) return blocked(parsed.error);
  return parsed.target === "dev"
    ? validateDev({ env, cwd, parsed, linkedRefOverride, fsImpl })
    : validateProd({ env, cwd, parsed, linkedRefOverride, fsImpl });
}

function validateDev({ env, cwd, parsed, linkedRefOverride, fsImpl }) {
  // 1. Never run from a production environment
  const appEnv = env.APP_ENV || "";
  const nodeEnv = env.NODE_ENV || "";
  if (appEnv.toLowerCase() === "production" || nodeEnv.toLowerCase() === "production") {
    return blocked("Pushing migrations in a production environment is strictly forbidden.");
  }

  // 2. Project reference from the environment
  const providedRef = (env.SUPABASE_PROJECT_REF || env.PROJECT_REF || "").trim();
  if (!providedRef) {
    return blocked(`SUPABASE_PROJECT_REF environment variable is not set. Expected: ${EXPECTED_DEV_PROJECT_REF}`);
  }
  if (FORBIDDEN_PROJECT_REFS.has(providedRef)) {
    return blocked(
      `Project reference '${providedRef}' is a forbidden historical/deleted reference. Target the active DEV project '${EXPECTED_DEV_PROJECT_REF}'.`,
    );
  }
  if (providedRef !== EXPECTED_DEV_PROJECT_REF) {
    return blocked(`Provided project reference '${providedRef}' does not match expected DEV reference '${EXPECTED_DEV_PROJECT_REF}'.`);
  }

  // 3. .env.local must point at the DEV project
  const envLocalPath = path.resolve(cwd, ".env.local");
  if (!fsImpl.existsSync(envLocalPath)) {
    return blocked(".env.local file not found. Cannot verify target Supabase project configuration.");
  }
  const envFileRef = refFromSupabaseUrl(envFileUrl(String(fsImpl.readFileSync(envLocalPath, "utf-8"))));
  if (!envFileRef) return blocked("NEXT_PUBLIC_SUPABASE_URL is missing or invalid in .env.local.");
  if (envFileRef !== EXPECTED_DEV_PROJECT_REF) {
    return blocked(`.env.local URL points to project '${envFileRef}', but DEV project must be '${EXPECTED_DEV_PROJECT_REF}'.`);
  }

  // 4. The CLI must be linked to DEV
  const link = readLinkState(fsImpl, cwd, linkedRefOverride);
  if (link.error === "missing") {
    return blocked(
      `Supabase CLI linked project file (supabase/.temp/project-ref) not found. Run 'npx supabase link --project-ref ${EXPECTED_DEV_PROJECT_REF}' first.`,
    );
  }
  if (link.refFile !== EXPECTED_DEV_PROJECT_REF) {
    return blocked(
      `Supabase CLI is currently linked to '${link.refFile}', which DOES NOT MATCH expected DEV project '${EXPECTED_DEV_PROJECT_REF}'. Run 'npx supabase link --project-ref ${EXPECTED_DEV_PROJECT_REF}'.`,
    );
  }

  // 5. Explicit confirmation
  if (!parsed.flags.has("--yes")) {
    return blocked(
      `Missing confirmation flag --yes. Run with: SUPABASE_PROJECT_REF=${EXPECTED_DEV_PROJECT_REF} pnpm db:push --target dev --yes`,
    );
  }

  return {
    ok: true,
    target: "dev",
    expectedRef: EXPECTED_DEV_PROJECT_REF,
    providedRef,
    linkedRef: link.refFile,
    dryRun: parsed.flags.has("--dry-run"),
  };
}

function validateProd({ env, cwd, parsed, linkedRefOverride, fsImpl }) {
  const dryRun = parsed.flags.has("--dry-run");

  // 1. Two separate explicit confirmations (the dry run skips only the typed ref)
  if (!parsed.flags.has("--i-am-targeting-production")) {
    return blocked("Production target requires --i-am-targeting-production.");
  }
  if (!dryRun) {
    if (!parsed.flags.has("--confirm-production")) {
      return blocked(`Production target requires --confirm-production=${EXPECTED_PROD_PROJECT_REF} (type the production project ref).`);
    }
    if (parsed.confirmValue !== EXPECTED_PROD_PROJECT_REF) {
      return blocked(
        `--confirm-production value does not match the production project ref '${EXPECTED_PROD_PROJECT_REF}'. Nothing was run.`,
      );
    }
  } else if (parsed.flags.has("--confirm-production") && parsed.confirmValue !== EXPECTED_PROD_PROJECT_REF) {
    return blocked(`--confirm-production value does not match the production project ref '${EXPECTED_PROD_PROJECT_REF}'.`);
  }

  // 2. Project reference from the shell
  const providedRef = (env.SUPABASE_PROJECT_REF || env.PROJECT_REF || "").trim();
  if (!providedRef) {
    return blocked(`SUPABASE_PROJECT_REF environment variable is not set. Expected: ${EXPECTED_PROD_PROJECT_REF}`);
  }
  if (providedRef === EXPECTED_DEV_PROJECT_REF) {
    return blocked(`SUPABASE_PROJECT_REF is the DEV project '${providedRef}'. A production run must name '${EXPECTED_PROD_PROJECT_REF}'.`);
  }
  if (RETIRED_PROJECT_REFS.has(providedRef)) {
    return blocked(`Project reference '${providedRef}' is a forbidden historical/deleted reference.`);
  }
  if (providedRef !== EXPECTED_PROD_PROJECT_REF) {
    return blocked(`Provided project reference '${providedRef}' does not match the production reference '${EXPECTED_PROD_PROJECT_REF}'.`);
  }

  // 3. Production URL from the shell, exactly
  const rawUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!rawUrl) {
    return blocked(`NEXT_PUBLIC_SUPABASE_URL is not set in the shell. Export ${PROD_PROJECT_URL} for this session.`);
  }
  const normalisedUrl = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
  if (normalisedUrl !== PROD_PROJECT_URL) {
    return blocked(`NEXT_PUBLIC_SUPABASE_URL must be exactly ${PROD_PROJECT_URL} for a production run.`);
  }

  // 4. Credentials from the shell, never from a file
  if (!String(env.SUPABASE_DB_PASSWORD ?? "").trim()) {
    return blocked("SUPABASE_DB_PASSWORD is not set in the shell. Export it for this session only; it is never read from a file.");
  }

  // 5. Environment hazards that could redirect the CLI
  const hazard = FORBIDDEN_PROD_ENV_VARS.find((name) => String(env[name] ?? "").trim() !== "");
  if (hazard) {
    return blocked(`Environment variable ${hazard} is set. It could redirect the CLI to another database; unset it and retry.`);
  }

  // 6. .env.local isolation (production values must never live there)
  const envLocalPath = path.resolve(cwd, ".env.local");
  if (fsImpl.existsSync(envLocalPath)) {
    const content = String(fsImpl.readFileSync(envLocalPath, "utf-8"));
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const key = trimmed.split("=")[0].trim();
      if (PROD_CREDENTIAL_NAMES.includes(key)) {
        return blocked(`.env.local defines ${key}. Production credentials must come from the shell session only.`);
      }
      // SUPABASE_PROD_REF is the one documented, non-secret reference flag allowed in .env.local (same rule as
      // scripts/check-env.mjs); the production ref anywhere else (a URL, a key) means production values leaked in.
      if (key !== "SUPABASE_PROD_REF" && trimmed.includes(EXPECTED_PROD_PROJECT_REF)) {
        return blocked(".env.local mentions the production project ref. It must hold DEV values only (docs/backend/ENVIRONMENTS.md).");
      }
    }
  }

  // 7. The CLI must be linked to production
  const link = readLinkState(fsImpl, cwd, linkedRefOverride);
  if (link.error === "missing") {
    return blocked(
      `Supabase CLI linked project file (supabase/.temp/project-ref) not found. Run 'npx supabase link --project-ref ${EXPECTED_PROD_PROJECT_REF}' first.`,
    );
  }
  if (link.error === "unreadable-json") {
    return blocked("supabase/.temp/linked-project.json exists but cannot be read. Re-run 'npx supabase link' for the production project.");
  }
  if (link.refFile !== EXPECTED_PROD_PROJECT_REF) {
    return blocked(
      `Supabase CLI is linked to '${link.refFile}', not the production project '${EXPECTED_PROD_PROJECT_REF}'. Run 'npx supabase link --project-ref ${EXPECTED_PROD_PROJECT_REF}'.`,
    );
  }
  if (link.jsonRef !== null && link.jsonRef !== EXPECTED_PROD_PROJECT_REF) {
    return blocked(
      `supabase/.temp/linked-project.json names '${link.jsonRef}', which disagrees with the production project. Re-run 'npx supabase link --project-ref ${EXPECTED_PROD_PROJECT_REF}'.`,
    );
  }

  return {
    ok: true,
    target: "prod",
    expectedRef: EXPECTED_PROD_PROJECT_REF,
    providedRef,
    linkedRef: link.refFile,
    dryRun,
  };
}

/**
 * The exact Supabase CLI arguments for a validated target. Throws for any ref that does not belong to the target, so
 * nothing but a known project can ever reach the command line (which on Windows goes through a shell).
 * @param {string} [projectRef]
 * @param {{ target?: "dev" | "prod", dryRun?: boolean }} [options]
 */
export function buildPushArgs(projectRef = EXPECTED_DEV_PROJECT_REF, { target = "dev", dryRun = false } = {}) {
  if (target === "prod") {
    if (projectRef !== EXPECTED_PROD_PROJECT_REF) {
      throw new Error(`BLOCKED: Cannot construct production push arguments for project '${projectRef}'.`);
    }
    // No --include-all in production: the CLI's own history check stops anything out of order. No --password: the
    // password travels in the child's environment, never on the command line.
    return ["supabase", "db", "push", `--remote=${projectRef}`, ...(dryRun ? ["--dry-run"] : ["--yes"])];
  }
  if (target !== "dev" || FORBIDDEN_PROJECT_REFS.has(projectRef) || projectRef !== EXPECTED_DEV_PROJECT_REF) {
    throw new Error(`BLOCKED: Cannot construct push arguments for non-DEV project '${projectRef}'.`);
  }
  return ["supabase", "db", "push", `--remote=${projectRef}`, "--include-all", ...(dryRun ? ["--dry-run"] : []), "--yes"];
}

/**
 * Resolves the subprocess execution configuration for the current or specified platform.
 * @param {string} [platform]
 * @param {string} [projectRef]
 * @param {{ target?: "dev" | "prod", dryRun?: boolean }} [options]
 */
export function getSpawnConfig(platform = process.platform, projectRef = EXPECTED_DEV_PROJECT_REF, options = {}) {
  const isWindows = platform === "win32";
  return {
    cmd: isWindows ? "npx.cmd" : "npx",
    args: buildPushArgs(projectRef, options),
    options: {
      shell: isWindows,
      stdio: "inherit",
    },
  };
}

/**
 * Validates and then runs the push. Returns 0 on success; every failure goes through `exitHandler` with the
 * subprocess's own exit code where there is one.
 * @param {object} [options]
 */
export function runPush({
  spawner = spawnSync,
  exitHandler = process.exit,
  env = process.env,
  cwd = process.cwd(),
  args = process.argv.slice(2),
  platform = process.platform,
  linkedRefOverride = null,
  fsImpl = fs,
} = {}) {
  const result = validatePushConfiguration({ env, cwd, args, linkedRefOverride, fsImpl });
  const parsed = parseArgs(args);
  const target = parsed.target ?? null;

  console.log("\n=== VROOMA GUARDED DB PUSH ===");
  if (target === "prod") {
    console.log("*** TARGET: PRODUCTION ***");
    console.log(`Production project ref   : ${EXPECTED_PROD_PROJECT_REF}`);
    console.log(`Production project URL   : ${PROD_PROJECT_URL}`);
    console.log(`Provided project ref     : ${env.SUPABASE_PROJECT_REF || "(none)"}`);
  } else {
    console.log(`Expected DEV project ref : ${EXPECTED_DEV_PROJECT_REF}`);
    console.log(`Provided project ref     : ${env.SUPABASE_PROJECT_REF || "(none)"}`);
  }

  if (!result.ok) {
    console.error(`\n❌ ${result.error}\n`);
    return exitHandler(1);
  }

  console.log(`Linked CLI project ref   : ${result.linkedRef}`);
  console.log(
    result.target === "prod"
      ? `Confirmations            : --i-am-targeting-production${result.dryRun ? " (dry run: nothing will be applied)" : " + typed project ref"}`
      : "Confirmation flag (--yes): PRESENT",
  );
  console.log("\n✅ Safety checks passed. Starting the Supabase CLI...\n");

  const spawnConfig = getSpawnConfig(platform, result.expectedRef, { target: result.target, dryRun: result.dryRun });
  console.log(`Executing: ${spawnConfig.cmd} ${spawnConfig.args.join(" ")} (shell: ${spawnConfig.options.shell})`);

  const afterRun = () => {
    if (result.target === "prod") {
      console.log(
        `\nThe Supabase CLI is still linked to PRODUCTION. DEV pushes stay blocked until you re-link:\n  npx supabase link --project-ref ${EXPECTED_DEV_PROJECT_REF}\n`,
      );
    }
  };

  const execution = spawner(spawnConfig.cmd, spawnConfig.args, { ...spawnConfig.options, env });

  // 1. The subprocess could not be started (for example ENOENT)
  if (execution.error) {
    console.error(`\n❌ Failed to spawn Supabase CLI subprocess (${spawnConfig.cmd}): ${execution.error.message || execution.error}`);
    if (execution.error.code) console.error(`Error code: ${execution.error.code}`);
    afterRun();
    return exitHandler(1);
  }

  // 2. Killed or ended without an exit status
  if (execution.status === null) {
    console.error(`\n❌ Supabase CLI process terminated abnormally without an exit status (signal: ${execution.signal || "unknown"}).`);
    afterRun();
    return exitHandler(1);
  }

  // 3. The CLI failed: pass its exit code through
  if (execution.status !== 0) {
    console.error(`\n❌ Database push command failed with exit code ${execution.status}. Check the CLI error output above.`);
    afterRun();
    return exitHandler(execution.status);
  }

  console.log(result.dryRun ? "\n✅ Dry run finished. Nothing was applied." : "\n✅ Database migrations applied successfully!");
  afterRun();
  return 0;
}

// Run when executed directly (never when imported by the tests)
const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runPush();
}
