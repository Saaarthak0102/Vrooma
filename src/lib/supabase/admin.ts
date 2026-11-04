import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Admin Supabase client using SUPABASE_SECRET_KEY (or legacy service_role key).
 * Bypasses RLS. Strictly restricted to allow-listed administrative functions.
 * NEVER import this file into any client component or general repository function.
 */
export function createAdminClient() {
  const secretKey =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !secretKey) {
    if (env.NEXT_PUBLIC_USE_MOCK) {
      return null as any;
    }
    throw new Error("SUPABASE_SECRET_KEY is required to initialize Admin client");
  }

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
