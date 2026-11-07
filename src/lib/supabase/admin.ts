import "server-only";

if (typeof window !== "undefined") {
  throw new Error("createAdminClient must never be called from the browser/client side.");
}

import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

let cachedAdminClient: SupabaseClient<Database> | null = null;

/**
 * Admin Supabase client using SUPABASE_SECRET_KEY (or legacy service_role key).
 * Bypasses RLS. Strictly restricted to allow-listed administrative functions.
 * NEVER import this file into any client component or general repository function.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const secretKey =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !secretKey) {
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    if (isBuildPhase) {
      console.warn("⚠️ [supabase/admin] Missing admin credentials during build phase.");
    } else {
      console.warn("⚠️ [supabase/admin] SUPABASE_SECRET_KEY is required to initialize Admin client.");
    }
  }

  cachedAdminClient = createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    secretKey || "placeholder-secret-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return cachedAdminClient;
}
