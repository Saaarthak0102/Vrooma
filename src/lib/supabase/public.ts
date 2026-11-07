import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

let cachedPublicClient: SupabaseClient<Database> | null = null;

/**
 * Public Supabase client for ISR and statically cached reads.
 * MUST NEVER read cookies or user headers so Next.js static rendering (ISR)
 * is never de-optimized into dynamic request-time rendering.
 */
export function createPublicClient(): SupabaseClient<Database> {
  if (cachedPublicClient) {
    return cachedPublicClient;
  }

  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    console.warn("⚠️ [supabase/public] Missing Supabase URL or publishable key.");
  }

  cachedPublicClient = createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    publishableKey || "placeholder-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  return cachedPublicClient;
}
