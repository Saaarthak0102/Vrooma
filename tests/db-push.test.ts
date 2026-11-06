import { describe, it, expect, vi } from "vitest";
import {
  validatePushConfiguration,
  buildPushArgs,
  getSpawnConfig,
  runPush,
  EXPECTED_DEV_PROJECT_REF,
  FORBIDDEN_PROJECT_REFS,
} from "../scripts/db-push.mjs";

describe("Guarded db-push.mjs Validation Runner", () => {
  const validEnv: NodeJS.ProcessEnv = {
    SUPABASE_PROJECT_REF: EXPECTED_DEV_PROJECT_REF,
    APP_ENV: "development",
    NODE_ENV: "development",
  };

  it("passes when all environment, linked ref, and --yes flags match the active DEV project", () => {
    const result = validatePushConfiguration({
      env: validEnv,
      args: ["--yes"],
      linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
    });

    expect(result.ok).toBe(true);
    expect(result.expectedRef).toBe(EXPECTED_DEV_PROJECT_REF);
    expect(result.providedRef).toBe(EXPECTED_DEV_PROJECT_REF);
    expect(result.linkedRef).toBe(EXPECTED_DEV_PROJECT_REF);
  });

  it("blocks execution when SUPABASE_PROJECT_REF is missing", () => {
    const result = validatePushConfiguration({
      env: { ...validEnv, SUPABASE_PROJECT_REF: "" },
      args: ["--yes"],
      linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("SUPABASE_PROJECT_REF environment variable is not set");
  });

  it("blocks execution when SUPABASE_PROJECT_REF uses the deleted old DEV ref 'gmyrehlrmifxckszrdje'", () => {
    const result = validatePushConfiguration({
      env: { ...validEnv, SUPABASE_PROJECT_REF: "gmyrehlrmifxckszrdje" },
      args: ["--yes"],
      linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("forbidden historical/deleted reference");
  });

  it("blocks execution when SUPABASE_PROJECT_REF uses the old ref 'ajumkjokagqfdikfguti'", () => {
    const result = validatePushConfiguration({
      env: { ...validEnv, SUPABASE_PROJECT_REF: "ajumkjokagqfdikfguti" },
      args: ["--yes"],
      linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("forbidden historical/deleted reference");
  });

  it("blocks execution when an arbitrary unknown project ref is passed", () => {
    const result = validatePushConfiguration({
      env: { ...validEnv, SUPABASE_PROJECT_REF: "some-random-project-ref" },
      args: ["--yes"],
      linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("does not match expected DEV reference");
  });

  it("blocks execution in production environment (APP_ENV=production)", () => {
    const result = validatePushConfiguration({
      env: { ...validEnv, APP_ENV: "production" },
      args: ["--yes"],
      linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("production environment is strictly forbidden");
  });

  it("blocks execution when CLI linked project does not match DEV project", () => {
    const result = validatePushConfiguration({
      env: validEnv,
      args: ["--yes"],
      linkedRefOverride: "gmyrehlrmifxckszrdje",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Supabase CLI is currently linked to 'gmyrehlrmifxckszrdje'");
  });

  it("blocks execution when confirmation flag --yes is missing", () => {
    const result = validatePushConfiguration({
      env: validEnv,
      args: [],
      linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Missing confirmation flag --yes");
  });

  describe("buildPushArgs explicit target generator", () => {
    it("constructs explicit --remote=<dev-ref> and --include-all for active DEV project", () => {
      const args = buildPushArgs(EXPECTED_DEV_PROJECT_REF);
      expect(args).toEqual([
        "supabase",
        "db",
        "push",
        `--remote=${EXPECTED_DEV_PROJECT_REF}`,
        "--include-all",
        "--yes",
      ]);
      expect(args).not.toContain("--linked");
    });

    it("defaults to EXPECTED_DEV_PROJECT_REF when called without arguments", () => {
      const args = buildPushArgs();
      expect(args).toEqual([
        "supabase",
        "db",
        "push",
        `--remote=${EXPECTED_DEV_PROJECT_REF}`,
        "--include-all",
        "--yes",
      ]);
    });

    it("strictly throws and blocks constructing push arguments for production project 'ajumkjokagqfdikfguti'", () => {
      expect(() => buildPushArgs("ajumkjokagqfdikfguti")).toThrow(
        /BLOCKED: Cannot construct push arguments for non-DEV project 'ajumkjokagqfdikfguti'/
      );
    });

    it("strictly throws and blocks constructing push arguments for deleted legacy DEV ref 'gmyrehlrmifxckszrdje'", () => {
      expect(() => buildPushArgs("gmyrehlrmifxckszrdje")).toThrow(
        /BLOCKED: Cannot construct push arguments for non-DEV project 'gmyrehlrmifxckszrdje'/
      );
    });

    it("strictly throws and blocks constructing push arguments for arbitrary unknown project refs", () => {
      expect(() => buildPushArgs("random-external-project")).toThrow(
        /BLOCKED: Cannot construct push arguments for non-DEV project 'random-external-project'/
      );
    });
  });

  describe("CLI arguments tampering protection", () => {
    it("blocks user-supplied --remote flag override in CLI args", () => {
      const result = validatePushConfiguration({
        env: validEnv,
        args: ["--yes", "--remote=ajumkjokagqfdikfguti"],
        linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Unauthorized CLI override flag '--remote=ajumkjokagqfdikfguti'");
    });

    it("blocks user-supplied --project-ref flag override in CLI args", () => {
      const result = validatePushConfiguration({
        env: validEnv,
        args: ["--yes", "--project-ref", "some-ref"],
        linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Unauthorized CLI override flag");
    });

    it("blocks user-supplied --linked flag override in CLI args", () => {
      const result = validatePushConfiguration({
        env: validEnv,
        args: ["--yes", "--linked"],
        linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Unauthorized CLI override flag '--linked'");
    });
  });

  describe("getSpawnConfig Platform Execution Resolution", () => {
    it("configures shell-based npx.cmd execution for Windows (win32)", () => {
      const config = getSpawnConfig("win32", EXPECTED_DEV_PROJECT_REF);
      expect(config.cmd).toBe("npx.cmd");
      expect(config.options.shell).toBe(true);
      expect(config.options.stdio).toBe("inherit");
      expect(config.args).toEqual([
        "supabase",
        "db",
        "push",
        `--remote=${EXPECTED_DEV_PROJECT_REF}`,
        "--include-all",
        "--yes",
      ]);
    });

    it("configures direct npx execution without shell for Linux", () => {
      const config = getSpawnConfig("linux", EXPECTED_DEV_PROJECT_REF);
      expect(config.cmd).toBe("npx");
      expect(config.options.shell).toBe(false);
      expect(config.options.stdio).toBe("inherit");
      expect(config.args).toEqual([
        "supabase",
        "db",
        "push",
        `--remote=${EXPECTED_DEV_PROJECT_REF}`,
        "--include-all",
        "--yes",
      ]);
    });

    it("configures direct npx execution without shell for macOS (darwin)", () => {
      const config = getSpawnConfig("darwin", EXPECTED_DEV_PROJECT_REF);
      expect(config.cmd).toBe("npx");
      expect(config.options.shell).toBe(false);
      expect(config.options.stdio).toBe("inherit");
      expect(config.args).toEqual([
        "supabase",
        "db",
        "push",
        `--remote=${EXPECTED_DEV_PROJECT_REF}`,
        "--include-all",
        "--yes",
      ]);
    });
  });

  describe("runPush Subprocess Error & Exit Handling (Mock Spawner)", () => {
    it("handles execution.error (e.g. spawn ENOENT) and exits with code 1", () => {
      const mockExit = vi.fn();
      const mockSpawner = vi.fn().mockReturnValue({
        error: Object.assign(new Error("spawnSync npx.cmd ENOENT"), { code: "ENOENT" }),
        status: null,
      });

      runPush({
        env: validEnv,
        args: ["--yes"],
        linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
        spawner: mockSpawner,
        exitHandler: mockExit,
        platform: "win32",
      });

      expect(mockSpawner).toHaveBeenCalledWith(
        "npx.cmd",
        ["supabase", "db", "push", `--remote=${EXPECTED_DEV_PROJECT_REF}`, "--include-all", "--yes"],
        expect.objectContaining({ shell: true, stdio: "inherit" })
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("handles execution.status === null (abnormal signal kill) and exits with code 1", () => {
      const mockExit = vi.fn();
      const mockSpawner = vi.fn().mockReturnValue({
        error: undefined,
        status: null,
        signal: "SIGKILL",
      });

      runPush({
        env: validEnv,
        args: ["--yes"],
        linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
        spawner: mockSpawner,
        exitHandler: mockExit,
        platform: "win32",
      });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("handles non-zero exit code from Supabase CLI without masking with generic auth message", () => {
      const mockExit = vi.fn();
      const mockSpawner = vi.fn().mockReturnValue({
        error: undefined,
        status: 42,
      });

      runPush({
        env: validEnv,
        args: ["--yes"],
        linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
        spawner: mockSpawner,
        exitHandler: mockExit,
        platform: "linux",
      });

      expect(mockSpawner).toHaveBeenCalledWith(
        "npx",
        ["supabase", "db", "push", `--remote=${EXPECTED_DEV_PROJECT_REF}`, "--include-all", "--yes"],
        expect.objectContaining({ shell: false, stdio: "inherit" })
      );
      expect(mockExit).toHaveBeenCalledWith(42);
    });

    it("succeeds with exit code 0 when Supabase CLI completes with status 0", () => {
      const mockExit = vi.fn();
      const mockSpawner = vi.fn().mockReturnValue({
        error: undefined,
        status: 0,
      });

      const exitCode = runPush({
        env: validEnv,
        args: ["--yes"],
        linkedRefOverride: EXPECTED_DEV_PROJECT_REF,
        spawner: mockSpawner,
        exitHandler: mockExit,
        platform: "win32",
      });

      expect(exitCode).toBe(0);
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
});
