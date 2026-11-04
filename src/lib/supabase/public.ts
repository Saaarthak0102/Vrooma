import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Public Supabase client for ISR and statically cached reads.
 * MUST NEVER read cookies or user headers so Next.js static rendering (ISR)
 * is never de-optimized into dynamic request-time rendering.
 */
export function createPublicClient() {
  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    if (env.NEXT_PUBLIC_USE_MOCK) {
      return null as any;
    }
  }

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

