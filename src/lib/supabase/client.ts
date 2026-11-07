import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

export function createClient() {
  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    publishableKey || "placeholder-key"
  );
}
