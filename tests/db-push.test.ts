import path from "node:path";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  validatePushConfiguration,
  parseArgs,
  buildPushArgs,
  getSpawnConfig,
  runPush,
  EXPECTED_DEV_PROJECT_REF,
  EXPECTED_PROD_PROJECT_REF,
  LEGACY_DELETED_PROJECT_REF,
  PROD_PROJECT_URL,
} from "../scripts/db-push.mjs";

/**
 * Hermetic: every test uses an in-memory file system and a mock spawner. Nothing reads the real .env.local, .env.prod or
 * supabase/.temp, and no test can start the Supabase CLI or reach a database.
 */

type Env = Record<string, string | undefined>;

const CWD = process.cwd();
const at = (rel: string) => path.resolve(CWD, rel);

function memFs(files: Record<string, string>) {
  const map = new Map(Object.entries(files).map(([rel, content]) => [at(rel), content]));
  return {
    existsSync: (p: string) => map.has(path.resolve(p)),
    readFileSync: (p: string) => {
      const v = map.get(path.resolve(p));
      if (v === undefined) throw new Error(`ENOENT ${p}`);
      return v;
    },
  };
}

const devFs = (over: Record<string, string> = {}) =>
  memFs({
    ".env.local": `NEXT_PUBLIC_SUPABASE_URL=https://${EXPECTED_DEV_PROJECT_REF}.supabase.co\nOTHER=1\n`,
    "supabase/.temp/project-ref": EXPECTED_DEV_PROJECT_REF,
    ...over,
  });

const SECRET = "s3cr3t-prod-db-password-value";

const prodFs = (over: Record<string, string> = {}) =>
  memFs({
    ".env.local": `NEXT_PUBLIC_SUPABASE_URL=https://${EXPECTED_DEV_PROJECT_REF}.supabase.co\n`,
    "supabase/.temp/project-ref": EXPECTED_PROD_PROJECT_REF,
    "supabase/.temp/linked-project.json": JSON.stringify({ ref: EXPECTED_PROD_PROJECT_REF, name: "x" }),
    ...over,
  });

const devEnv: Env = { SUPABASE_PROJECT_REF: EXPECTED_DEV_PROJECT_REF, APP_ENV: "development", NODE_ENV: "development" };
const devArgs = ["--target", "dev", "--yes"];

const prodEnv = (over: Env = {}): Env => ({
  SUPABASE_PROJECT_REF: EXPECTED_PROD_PROJECT_REF,
  NEXT_PUBLIC_SUPABASE_URL: PROD_PROJECT_URL,
  SUPABASE_DB_PASSWORD: SECRET,
  ...over,
});
const prodArgs = ["--target", "prod", "--i-am-targeting-production", `--confirm-production=${EXPECTED_PROD_PROJECT_REF}`];

const dev = (over: { env?: Env; args?: string[]; fsImpl?: any; linkedRefOverride?: string | null } = {}) =>
  validatePushConfiguration({ env: devEnv, args: devArgs, fsImpl: devFs(), cwd: CWD, ...over });
const prod = (over: { env?: Env; args?: string[]; fsImpl?: any; linkedRefOverride?: string | null } = {}) =>
  validatePushConfiguration({ env: prodEnv(), args: prodArgs, fsImpl: prodFs(), cwd: CWD, ...over });

const DEV_CLI = ["supabase", "db", "push", `--remote=${EXPECTED_DEV_PROJECT_REF}`, "--include-all", "--yes"];
const PROD_APPLY_CLI = ["supabase", "db", "push", `--remote=${EXPECTED_PROD_PROJECT_REF}`, "--yes"];
const PROD_DRY_CLI = ["supabase", "db", "push", `--remote=${EXPECTED_PROD_PROJECT_REF}`, "--dry-run"];

describe("DEV target (existing protections preserved)", () => {
  it("passes when environment, .env.local, CLI link, --target dev and --yes all match the DEV project", () => {
    const result = dev();
    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ target: "dev", expectedRef: EXPECTED_DEV_PROJECT_REF, providedRef: EXPECTED_DEV_PROJECT_REF, linkedRef: EXPECTED_DEV_PROJECT_REF });
  });

  it("accepts --target=dev", () => {
    expect(dev({ args: ["--target=dev", "--yes"] }).ok).toBe(true);
  });

  it("blocks when --target is missing or unknown", () => {
    expect(dev({ args: ["--yes"] }).error).toContain("Missing --target");
    expect(dev({ args: ["--target", "staging", "--yes"] }).error).toContain("--target must be 'dev' or 'prod'");
    expect(dev({ args: ["--target"] }).error).toContain("--target must be 'dev' or 'prod'");
  });

  it("blocks when SUPABASE_PROJECT_REF is missing", () => {
    const result = dev({ env: { ...devEnv, SUPABASE_PROJECT_REF: "" } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("SUPABASE_PROJECT_REF environment variable is not set");
  });

  it("blocks the deleted legacy ref and the production ref", () => {
    expect(dev({ env: { ...devEnv, SUPABASE_PROJECT_REF: LEGACY_DELETED_PROJECT_REF } }).error).toContain("forbidden historical/deleted reference");
    expect(dev({ env: { ...devEnv, SUPABASE_PROJECT_REF: EXPECTED_PROD_PROJECT_REF } }).error).toContain("forbidden historical/deleted reference");
  });

  it("blocks an arbitrary unknown project ref", () => {
    const result = dev({ env: { ...devEnv, SUPABASE_PROJECT_REF: "some-random-project-ref" } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("does not match expected DEV reference");
  });

  it("blocks execution in a production environment (APP_ENV or NODE_ENV)", () => {
    expect(dev({ env: { ...devEnv, APP_ENV: "production" } }).error).toContain("production environment is strictly forbidden");
    expect(dev({ env: { ...devEnv, NODE_ENV: "production" } }).error).toContain("production environment is strictly forbidden");
  });

  it("blocks when .env.local is missing, has no URL, or points at another project", () => {
    expect(dev({ fsImpl: memFs({ "supabase/.temp/project-ref": EXPECTED_DEV_PROJECT_REF }) }).error).toContain(".env.local file not found");
    expect(dev({ fsImpl: devFs({ ".env.local": "OTHER=1\n" }) }).error).toContain("missing or invalid in .env.local");
    expect(dev({ fsImpl: devFs({ ".env.local": `NEXT_PUBLIC_SUPABASE_URL=https://${EXPECTED_PROD_PROJECT_REF}.supabase.co\n` }) }).error).toContain(
      `points to project '${EXPECTED_PROD_PROJECT_REF}'`,
    );
  });

  it("blocks when the CLI link is missing or points at another project", () => {
    expect(dev({ fsImpl: memFs({ ".env.local": `NEXT_PUBLIC_SUPABASE_URL=https://${EXPECTED_DEV_PROJECT_REF}.supabase.co\n` }) }).error).toContain("linked project file");
    expect(dev({ fsImpl: devFs({ "supabase/.temp/project-ref": EXPECTED_PROD_PROJECT_REF }) }).error).toContain(`linked to '${EXPECTED_PROD_PROJECT_REF}'`);
    expect(dev({ linkedRefOverride: LEGACY_DELETED_PROJECT_REF }).error).toContain(`linked to '${LEGACY_DELETED_PROJECT_REF}'`);
  });

  it("blocks when --yes is missing", () => {
    const result = dev({ args: ["--target", "dev"] });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Missing confirmation flag --yes");
  });

  it("rejects production flags on a DEV run", () => {
    expect(dev({ args: [...devArgs, "--i-am-targeting-production"] }).error).toContain("not valid for --target dev");
    expect(dev({ args: [...devArgs, `--confirm-production=${EXPECTED_PROD_PROJECT_REF}`] }).error).toContain("not valid for --target dev");
  });
});

describe("PRODUCTION target", () => {
  it("passes only when every check is satisfied", () => {
    const result = prod();
    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ target: "prod", expectedRef: EXPECTED_PROD_PROJECT_REF, providedRef: EXPECTED_PROD_PROJECT_REF, linkedRef: EXPECTED_PROD_PROJECT_REF, dryRun: false });
  });

  it("accepts --target=prod and a trailing slash on the URL", () => {
    expect(prod({ args: ["--target=prod", "--i-am-targeting-production", `--confirm-production=${EXPECTED_PROD_PROJECT_REF}`] }).ok).toBe(true);
    expect(prod({ env: prodEnv({ NEXT_PUBLIC_SUPABASE_URL: `${PROD_PROJECT_URL}/` }) }).ok).toBe(true);
  });

  describe("confirmations", () => {
    it("requires --i-am-targeting-production", () => {
      const result = prod({ args: ["--target", "prod", `--confirm-production=${EXPECTED_PROD_PROJECT_REF}`] });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("--i-am-targeting-production");
    });

    it("requires --confirm-production, and the exact production ref in it", () => {
      expect(prod({ args: ["--target", "prod", "--i-am-targeting-production"] }).error).toContain("requires --confirm-production");
      expect(prod({ args: ["--target", "prod", "--i-am-targeting-production", "--confirm-production"] }).error).toContain("--confirm-production needs");
      expect(prod({ args: ["--target", "prod", "--i-am-targeting-production", "--confirm-production=wrong"] }).error).toContain("does not match the production project ref");
      expect(prod({ args: ["--target", "prod", "--i-am-targeting-production", `--confirm-production=${EXPECTED_DEV_PROJECT_REF}`] }).error).toContain("does not match the production project ref");
    });

    it("rejects --yes: that flag belongs to DEV", () => {
      expect(prod({ args: [...prodArgs, "--yes"] }).error).toContain("not valid for --target prod");
    });

    it("--dry-run needs no typed ref, but every other check still applies", () => {
      const dry = ["--target", "prod", "--i-am-targeting-production", "--dry-run"];
      expect(prod({ args: dry })).toMatchObject({ ok: true, dryRun: true });
      expect(prod({ args: ["--target", "prod", "--dry-run"] }).error).toContain("--i-am-targeting-production");
      expect(prod({ args: dry, env: prodEnv({ SUPABASE_DB_PASSWORD: "" }) }).ok).toBe(false);
      expect(prod({ args: dry, fsImpl: prodFs({ "supabase/.temp/project-ref": EXPECTED_DEV_PROJECT_REF }) }).ok).toBe(false);
      expect(prod({ args: [...dry, "--confirm-production=wrong"] }).ok).toBe(false);
    });
  });

  describe("project reference", () => {
    it("blocks when missing, DEV, the deleted legacy ref, or anything else", () => {
      expect(prod({ env: prodEnv({ SUPABASE_PROJECT_REF: "" }) }).error).toContain("SUPABASE_PROJECT_REF environment variable is not set");
      expect(prod({ env: prodEnv({ SUPABASE_PROJECT_REF: EXPECTED_DEV_PROJECT_REF }) }).error).toContain("is the DEV project");
      expect(prod({ env: prodEnv({ SUPABASE_PROJECT_REF: LEGACY_DELETED_PROJECT_REF }) }).error).toContain("forbidden historical/deleted reference");
      expect(prod({ env: prodEnv({ SUPABASE_PROJECT_REF: "randomprojectref12345" }) }).error).toContain("does not match the production reference");
    });
  });

  describe("production URL", () => {
    it("must be present and exactly the production project", () => {
      expect(prod({ env: prodEnv({ NEXT_PUBLIC_SUPABASE_URL: "" }) }).error).toContain("NEXT_PUBLIC_SUPABASE_URL is not set");
      expect(prod({ env: prodEnv({ NEXT_PUBLIC_SUPABASE_URL: `https://${EXPECTED_DEV_PROJECT_REF}.supabase.co` }) }).error).toContain("must be exactly");
      for (const bad of [
        `${PROD_PROJECT_URL}.evil.com`,
        `${PROD_PROJECT_URL}/rest/v1`,
        `${PROD_PROJECT_URL}?x=1`,
        `${PROD_PROJECT_URL}:5432`,
        `http://${EXPECTED_PROD_PROJECT_REF}.supabase.co`,
        `https://x.${EXPECTED_PROD_PROJECT_REF}.supabase.co`,
      ]) {
        expect(prod({ env: prodEnv({ NEXT_PUBLIC_SUPABASE_URL: bad }) }).ok, bad).toBe(false);
      }
    });
  });

  describe("credentials", () => {
    it("requires SUPABASE_DB_PASSWORD in the shell", () => {
      const missing = prod({ env: { ...prodEnv(), SUPABASE_DB_PASSWORD: undefined } });
      expect(missing.ok).toBe(false);
      expect(missing.error).toContain("SUPABASE_DB_PASSWORD is not set");
      expect(prod({ env: prodEnv({ SUPABASE_DB_PASSWORD: "   " }) }).ok).toBe(false);
    });

    it("blocks when .env.local defines production credentials", () => {
      for (const key of ["SUPABASE_DB_PASSWORD", "SUPABASE_ACCESS_TOKEN"]) {
        const result = prod({ fsImpl: prodFs({ ".env.local": `NEXT_PUBLIC_SUPABASE_URL=https://${EXPECTED_DEV_PROJECT_REF}.supabase.co\n${key}=abc\n` }) });
        expect(result.ok, key).toBe(false);
        expect(result.error).toContain(key);
        expect(result.error).not.toContain("abc");
      }
    });

    it("blocks when .env.local mentions the production project ref", () => {
      const result = prod({ fsImpl: prodFs({ ".env.local": `NEXT_PUBLIC_SUPABASE_URL=https://${EXPECTED_PROD_PROJECT_REF}.supabase.co\n` }) });
      expect(result.ok).toBe(false);
      expect(result.error).toContain(".env.local mentions the production project ref");
    });

    it("never reads production values from .env.local: a missing .env.local is fine", () => {
      expect(prod({ fsImpl: memFs({ "supabase/.temp/project-ref": EXPECTED_PROD_PROJECT_REF }) }).ok).toBe(true);
    });
  });

  describe("CLI link state", () => {
    it("blocks when linked to DEV, to something else, or not linked at all", () => {
      expect(prod({ fsImpl: prodFs({ "supabase/.temp/project-ref": EXPECTED_DEV_PROJECT_REF }) }).error).toContain(`linked to '${EXPECTED_DEV_PROJECT_REF}'`);
      expect(prod({ linkedRefOverride: LEGACY_DELETED_PROJECT_REF }).error).toContain("not the production project");
      const none = prod({ fsImpl: memFs({}) });
      expect(none.ok).toBe(false);
      expect(none.error).toContain("linked project file");
    });

    it("blocks when linked-project.json disagrees or cannot be read", () => {
      const mismatch = prod({ fsImpl: prodFs({ "supabase/.temp/linked-project.json": JSON.stringify({ ref: EXPECTED_DEV_PROJECT_REF }) }) });
      expect(mismatch.ok).toBe(false);
      expect(mismatch.error).toContain("disagrees with the production project");
      const broken = prod({ fsImpl: prodFs({ "supabase/.temp/linked-project.json": "{not json" }) });
      expect(broken.ok).toBe(false);
      expect(broken.error).toContain("cannot be read");
    });
  });

  describe("overrides", () => {
    it.each([
      "--remote=anything",
      "--remote",
      "--project-ref=x",
      "--project-ref",
      "--linked",
      "--local",
      "--db-url=postgres://x",
      "--password=hunter2",
      "--password",
      "-p",
      "--workdir=/elsewhere",
      "--include-all",
      "--include-seed",
      "--profile=other",
    ])("rejects the override flag %s", (flag) => {
      const result = prod({ args: [...prodArgs, flag] });
      expect(result.ok).toBe(false);
      expect(result.error).toContain(`Unauthorized CLI override flag '${flag}'`);
    });

    it("rejects unknown flags and positional arguments", () => {
      expect(prod({ args: [...prodArgs, "--force"] }).error).toContain("Unknown argument '--force'");
      expect(prod({ args: [...prodArgs, "extra"] }).error).toContain("Unknown argument 'extra'");
    });

    it.each(["SUPABASE_DB_URL", "DATABASE_URL", "POSTGRES_URL", "PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "SUPABASE_PROJECT_ID"])(
      "refuses to start with %s set in the environment",
      (name) => {
        const result = prod({ env: prodEnv({ [name]: "postgres://elsewhere" }) });
        expect(result.ok).toBe(false);
        expect(result.error).toContain(name);
      },
    );

    it("rejects --target given twice with different values", () => {
      expect(parseArgs(["--target", "dev", "--target", "prod"]).error).toContain("twice");
    });
  });
});

describe("buildPushArgs", () => {
  it("DEV: explicit --remote=<dev-ref>, --include-all and --yes (never --linked)", () => {
    expect(buildPushArgs(EXPECTED_DEV_PROJECT_REF)).toEqual(DEV_CLI);
    expect(buildPushArgs()).toEqual(DEV_CLI);
    expect(buildPushArgs(EXPECTED_DEV_PROJECT_REF)).not.toContain("--linked");
  });

  it("DEV: refuses production, legacy and arbitrary refs", () => {
    for (const ref of [EXPECTED_PROD_PROJECT_REF, LEGACY_DELETED_PROJECT_REF, "random-external-project"]) {
      expect(() => buildPushArgs(ref)).toThrow(new RegExp(`BLOCKED: Cannot construct push arguments for non-DEV project '${ref}'`));
    }
  });

  it("PRODUCTION apply: --remote=<prod-ref> and --yes only: no --include-all, no --password, no --linked", () => {
    const args = buildPushArgs(EXPECTED_PROD_PROJECT_REF, { target: "prod" });
    expect(args).toEqual(PROD_APPLY_CLI);
    for (const forbidden of ["--include-all", "--linked", "--local", "--db-url"]) expect(args).not.toContain(forbidden);
    expect(args.some((a) => a.startsWith("--password") || a === "-p")).toBe(false);
  });

  it("PRODUCTION dry run: --dry-run and no --yes", () => {
    expect(buildPushArgs(EXPECTED_PROD_PROJECT_REF, { target: "prod", dryRun: true })).toEqual(PROD_DRY_CLI);
  });

  it("PRODUCTION: refuses the DEV ref, the legacy ref and arbitrary refs", () => {
    for (const ref of [EXPECTED_DEV_PROJECT_REF, LEGACY_DELETED_PROJECT_REF, "random-external-project"]) {
      expect(() => buildPushArgs(ref, { target: "prod" })).toThrow(/BLOCKED: Cannot construct production push arguments/);
    }
  });

  it("an unknown target cannot build anything", () => {
    expect(() => buildPushArgs(EXPECTED_DEV_PROJECT_REF, { target: "staging" as any })).toThrow(/BLOCKED/);
  });
});

describe("getSpawnConfig", () => {
  it.each([
    ["win32", "npx.cmd", true],
    ["linux", "npx", false],
    ["darwin", "npx", false],
  ])("%s uses %s with shell=%s and inherited stdio", (platform, cmd, shell) => {
    for (const [ref, target, args] of [
      [EXPECTED_DEV_PROJECT_REF, "dev", DEV_CLI],
      [EXPECTED_PROD_PROJECT_REF, "prod", PROD_APPLY_CLI],
    ] as const) {
      const config = getSpawnConfig(platform, ref, { target });
      expect(config.cmd).toBe(cmd);
      expect(config.options).toEqual({ shell, stdio: "inherit" });
      expect(config.args).toEqual(args);
    }
  });
});

describe("runPush (mock spawner; the Supabase CLI is never started)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const runDev = (spawnerResult: any, extra: object = {}) => {
    const exit = vi.fn();
    const spawner = vi.fn().mockReturnValue(spawnerResult);
    const code = runPush({ env: devEnv, args: devArgs, fsImpl: devFs(), cwd: CWD, spawner, exitHandler: exit, platform: "win32", ...extra });
    return { exit, spawner, code };
  };
  const runProd = (spawnerResult: any, extra: object = {}) => {
    const exit = vi.fn();
    const spawner = vi.fn().mockReturnValue(spawnerResult);
    const code = runPush({ env: prodEnv(), args: prodArgs, fsImpl: prodFs(), cwd: CWD, spawner, exitHandler: exit, platform: "linux", ...extra });
    return { exit, spawner, code };
  };

  it("DEV: spawn error exits 1", () => {
    const { exit, spawner } = runDev({ error: Object.assign(new Error("spawnSync npx.cmd ENOENT"), { code: "ENOENT" }), status: null });
    expect(spawner).toHaveBeenCalledWith("npx.cmd", DEV_CLI, expect.objectContaining({ shell: true, stdio: "inherit" }));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("DEV: signal kill exits 1, a CLI failure passes its own exit code through, success returns 0", () => {
    expect(runDev({ status: null, signal: "SIGKILL" }).exit).toHaveBeenCalledWith(1);
    expect(runDev({ status: 42 }).exit).toHaveBeenCalledWith(42);
    const ok = runDev({ status: 0 });
    expect(ok.code).toBe(0);
    expect(ok.exit).not.toHaveBeenCalled();
  });

  it("PRODUCTION: runs the exact apply command once, with the password only in the environment", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { spawner, code, exit } = runProd({ status: 0 });
    expect(code).toBe(0);
    expect(exit).not.toHaveBeenCalled();
    expect(spawner).toHaveBeenCalledTimes(1);
    const [cmd, args, options] = spawner.mock.calls[0];
    expect(cmd).toBe("npx");
    expect(args).toEqual(PROD_APPLY_CLI);
    expect(args.join(" ")).not.toContain(SECRET);
    expect(options.env.SUPABASE_DB_PASSWORD).toBe(SECRET);
  });

  it("PRODUCTION dry run: passes --dry-run and not --yes", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { spawner } = runProd({ status: 0 }, { args: ["--target", "prod", "--i-am-targeting-production", "--dry-run"] });
    expect(spawner.mock.calls[0][1]).toEqual(PROD_DRY_CLI);
  });

  it("PRODUCTION: propagates spawn errors, signal kills and CLI exit codes", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(runProd({ error: Object.assign(new Error("ENOENT"), { code: "ENOENT" }), status: null }).exit).toHaveBeenCalledWith(1);
    expect(runProd({ status: null, signal: "SIGTERM" }).exit).toHaveBeenCalledWith(1);
    expect(runProd({ status: 3 }).exit).toHaveBeenCalledWith(3);
  });

  it("PRODUCTION: prints the exact target before running, never the password, and reminds you to re-link", () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a) => void logs.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...a) => void logs.push(a.join(" ")));
    runProd({ status: 0 });
    const text = logs.join("\n");
    expect(text).toContain("TARGET: PRODUCTION");
    expect(text).toContain(EXPECTED_PROD_PROJECT_REF);
    expect(text).toContain(PROD_PROJECT_URL);
    expect(text).toContain(`supabase link --project-ref ${EXPECTED_DEV_PROJECT_REF}`);
    expect(text).not.toContain(SECRET);
    // the banner comes before the CLI is started
    expect(text.indexOf("TARGET: PRODUCTION")).toBeLessThan(text.indexOf("Executing:"));
  });

  it("never starts the CLI when any validation fails, and exits 1", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cases: object[] = [
      { env: prodEnv({ SUPABASE_PROJECT_REF: EXPECTED_DEV_PROJECT_REF }) },
      { env: prodEnv({ SUPABASE_DB_PASSWORD: "" }) },
      { args: ["--target", "prod", "--i-am-targeting-production"] },
      { args: [...prodArgs, "--db-url=postgres://x"] },
      { fsImpl: prodFs({ "supabase/.temp/project-ref": EXPECTED_DEV_PROJECT_REF }) },
    ];
    for (const extra of cases) {
      const { spawner, exit } = runProd({ status: 0 }, extra);
      expect(spawner).not.toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(1);
    }
    const dev = runDev({ status: 0 }, { args: ["--yes"] });
    expect(dev.spawner).not.toHaveBeenCalled();
    expect(dev.exit).toHaveBeenCalledWith(1);
  });
});
