import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/server/auth/safe-next";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const nextParam = requestUrl.searchParams.get("next") || "/dashboard";

  // Check locale prefix from nextParam or default to 'en'
  const localeMatch = nextParam.match(/^\/(en|hi)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";

  // Handle user cancelled OAuth or error from provider
  if (error) {
    const errorParam = error === "access_denied" ? "oauth_cancelled" : "oauth_error";
    return NextResponse.redirect(
      new URL(`/${locale}/sign-in?error=${errorParam}`, env.NEXT_PUBLIC_SITE_URL)
    );
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        return NextResponse.redirect(
          new URL(`/${locale}/sign-in?error=exchange_failed`, env.NEXT_PUBLIC_SITE_URL)
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
            new URL(`/${locale}/onboarding?next=${encodeURIComponent(safeNext(nextParam, locale))}`, env.NEXT_PUBLIC_SITE_URL)
          );
        }
      }
    }
  }

  const finalRedirect = safeNext(nextParam, locale);
  return NextResponse.redirect(new URL(finalRedirect, env.NEXT_PUBLIC_SITE_URL));
}
