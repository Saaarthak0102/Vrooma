import { unstable_cache } from "next/cache";

/**
 * Safe caching wrapper for Next.js unstable_cache.
 * In production/server runtime, uses Next.js unstable_cache with cache tags and revalidation.
 * In unit testing or environments without Next.js cache context, directly executes the query.
 */
export function cachedQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  options?: { tags?: string[]; revalidate?: number | false }
): T {
  if (process.env.NODE_ENV === "test" || !options?.tags) {
    return fn;
  }

  try {
    return unstable_cache(fn, keyParts, options) as T;
  } catch {
    return fn;
  }
}

/**
 * Safe tag revalidation helper.
 * Calls Next.js revalidateTag if running inside Next.js request/action context.
 */
export function safeRevalidateTag(tag: string): void {
  try {
    // Dynamic require/import to prevent build-time or test runner crashes
    const { revalidateTag } = require("next/cache");
    revalidateTag(tag);
  } catch {
    // Safe no-op outside Next.js request cycle
  }
}

/**
 * Safe path revalidation helper.
 */
export function safeRevalidatePath(path: string): void {
  try {
    const { revalidatePath } = require("next/cache");
    revalidatePath(path);
  } catch {
    // Safe no-op outside Next.js request cycle
  }
}

