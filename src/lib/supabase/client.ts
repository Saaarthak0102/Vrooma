import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    if (env.NEXT_PUBLIC_USE_MOCK) {
      return null as any;
    }
  }

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey
  );
}
