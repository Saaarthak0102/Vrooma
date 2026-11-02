import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    // In mock mode, callers shouldn't invoke Supabase queries
    return null as any;
  }
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

