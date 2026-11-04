/**
 * src/lib/static-params.ts
 *
 * Resilient wrapper for Next.js generateStaticParams().
 * Catches database/network errors, logs a non-fatal warning, and returns []
 * to allow unknown routes to render dynamically on first request via dynamicParams = true.
 */

export async function safeStaticParams<T>(
  fn: () => Promise<T[]>,
  limit = 50
): Promise<T[]> {
  try {
    const results = await fn();
    if (!Array.isArray(results)) {
      return [];
    }
    return results.slice(0, limit);
  } catch (error) {
    console.warn(
      "⚠️ [safeStaticParams] Warning: Static parameter generation failed, falling back to dynamic on-demand rendering. Error:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

