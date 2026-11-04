/**
 * src/instrumentation.ts
 *
 * Runs once when the Next.js server starts (next dev / next start).
 * Does NOT run during `next build`, preventing false-positive build-time security throws.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateRuntimeEnv } = await import("@/lib/env");
    validateRuntimeEnv();
  }
}

