import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared rate limiter. The counter lives in Postgres (public.check_rate_limit -> private.hit_rate_limit), so it is
 * correct across serverless instances and survives cold starts. If the database call fails, a per-instance counter
 * takes over so a database blip neither blocks real users nor removes all protection.
 */

const fallback = new Map<string, { count: number; resetAt: number }>();

function fallbackAllow(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const hit = fallback.get(key);
  if (!hit || now > hit.resetAt) {
    fallback.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    // Keep the map small on long-lived instances.
    if (fallback.size > 5000) {
      for (const [k, v] of fallback) if (now > v.resetAt) fallback.delete(k);
    }
    return true;
  }
  hit.count += 1;
  return hit.count <= limit;
}

/** Returns true while `key` is within `limit` requests per `windowSeconds`. */
export async function rateLimit(key: string, limit: number, windowSeconds = 60): Promise<boolean> {
  const safeKey = key.slice(0, 200);
  try {
    const { data, error } = await createAdminClient().rpc("check_rate_limit" as never, {
      p_key: safeKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    } as never);
    if (error) throw new Error(error.message);
    return data === true;
  } catch (err: any) {
    console.warn(`[rate-limit] Database limiter unavailable, using local counter: ${err?.message}`);
    return fallbackAllow(safeKey, limit, windowSeconds);
  }
}

/** Test seam: clears the local fallback counters. */
export function resetRateLimitFallback(): void {
  fallback.clear();
}
