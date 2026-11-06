import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/server/auth/safe-next";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const nextParam = requestUrl.searchParams.get("next") || "/dashboard";

  // Handle user cancelled OAuth or error from provider
  if (error) {
    const errorParam = error === "access_denied" ? "oauth_cancelled" : "oauth_error";
    return NextResponse.redirect(
      new URL(`/sign-in?error=${errorParam}`, env.NEXT_PUBLIC_SITE_URL)
    );
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        return NextResponse.redirect(
          new URL("/sign-in?error=exchange_failed", env.NEXT_PUBLIC_SITE_URL)
        );
      }

      // Check if user has completed onboarding profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("id", user.id)
          .single();

        if (!profile?.onboarding_completed_at) {
          // New OAuth user needs onboarding
          return NextResponse.redirect(
            new URL(`/onboarding?next=${encodeURIComponent(safeNext(nextParam))}`, env.NEXT_PUBLIC_SITE_URL)
          );
        }
      }
    }
  }

  const finalRedirect = safeNext(nextParam);
  return NextResponse.redirect(new URL(finalRedirect, env.NEXT_PUBLIC_SITE_URL));
}
