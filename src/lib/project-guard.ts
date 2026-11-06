/**
 * src/lib/project-guard.ts
 *
 * Centralized, fail-closed project and environment isolation guard for Vrooma.
 * Enforces strict separation between the DEV Supabase project ('eobtzcwinjmimzisypca')
 * and the PRODUCTION Supabase project ('ajumkjokagqfdikfguti').
 */

export const DEV_REF = process.env.SUPABASE_DEV_REF || "eobtzcwinjmimzisypca";
export const PROD_REF = process.env.SUPABASE_PROD_REF || "ajumkjokagqfdikfguti";

export const KNOWN_FORBIDDEN_REFS = new Set([
  PROD_REF,
  "ajumkjokagqfdikfguti",
  "gmyrehlrmifxckszrdje", // historical deleted ref
]);

/**
 * Extracts a Supabase 20-character alphanumeric project reference from a URL or raw string.
 * e.g. "https://eobtzcwinjmimzisypca.supabase.co" -> "eobtzcwinjmimzisypca"
 */
export function extractProjectRef(urlOrRef?: string | null): string | null {
  if (!urlOrRef) return null;
  const trimmed = urlOrRef.trim();

  // URL pattern: https://<ref>.supabase.co or similar
  const urlMatch = trimmed.match(/^https?:\/\/([a-z0-9]{20})\.supabase\.(?:co|in|net)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();

  // Raw 20-character alphanumeric ref pattern
  const rawMatch = trimmed.match(/^[a-z0-9]{20}$/i);
  if (rawMatch) return rawMatch[0].toLowerCase();

  return null;
}

export interface GuardOptions {
  scriptName?: string;
  allowProd?: boolean;
  args?: string[];
  url?: string;
  env?: NodeJS.ProcessEnv;
  confirmedRef?: string;
}

export interface GuardResult {
  ok: boolean;
  resolvedRef: string | null;
  target: "dev" | "prod" | "unknown";
  error?: string;
}

/**
 * Validates execution environment against DEV/PROD project boundaries.
 */
export function validateEnvironmentSafety(options: GuardOptions = {}): GuardResult {
  const env = options.env || process.env;
  const args = options.args || process.argv.slice(2);
  const scriptName = options.scriptName || "script";

  const rawUrl = options.url || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
  const rawRef = env.SUPABASE_PROJECT_REF || extractProjectRef(rawUrl);

  const resolvedRef = rawRef ? extractProjectRef(rawRef) : null;

  // Determine intended target from CLI argument --target=prod / --target prod
  let target = "dev";
  const targetIdx = args.findIndex((a) => a === "--target" || a.startsWith("--target="));
  if (targetIdx !== -1) {
    const val = args[targetIdx].includes("=")
      ? args[targetIdx].split("=")[1]
      : args[targetIdx + 1];
    if (val && val.toLowerCase() === "prod") {
      target = "prod";
    }
  }

  // If resolved reference matches PRODUCTION
  if (resolvedRef === PROD_REF.toLowerCase() || target === "prod") {
    if (!options.allowProd) {
      return {
        ok: false,
        resolvedRef,
        target: "prod",
        error: `BLOCKED: '${scriptName}' is strictly forbidden from running against the PRODUCTION project ref ('${PROD_REF}').`,
      };
    }

    const hasProdFlag = args.includes("--i-am-targeting-production");
    if (!hasProdFlag) {
      return {
        ok: false,
        resolvedRef,
        target: "prod",
        error: `BLOCKED: Production execution of '${scriptName}' requires the explicit flag '--i-am-targeting-production'.`,
      };
    }

    if (options.confirmedRef !== undefined && options.confirmedRef !== PROD_REF) {
      return {
        ok: false,
        resolvedRef,
        target: "prod",
        error: `BLOCKED: Typed confirmation ref ('${options.confirmedRef}') did not match production ref ('${PROD_REF}').`,
      };
    }

    return {
      ok: true,
      resolvedRef: PROD_REF,
      target: "prod",
    };
  }

  // For DEV operations, ensure we are not mistakenly matching forbidden or prod refs
  if (resolvedRef && resolvedRef !== DEV_REF.toLowerCase()) {
    if (KNOWN_FORBIDDEN_REFS.has(resolvedRef)) {
      return {
        ok: false,
        resolvedRef,
        target: "unknown",
        error: `BLOCKED: Project reference '${resolvedRef}' is a forbidden production or legacy reference.`,
      };
    }
  }

  return {
    ok: true,
    resolvedRef: resolvedRef || DEV_REF,
    target: "dev",
  };
}

/**
 * Asserts safe DEV environment synchronously. Throws if targeted against production.
 */
export function assertSafeDevEnvironment(scriptName: string, url?: string): void {
  const result = validateEnvironmentSafety({ scriptName, allowProd: false, url });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

