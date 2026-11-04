import { NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/server/auth/safe-next";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextParam = requestUrl.searchParams.get("next") || "/dashboard";

  const localeMatch = nextParam.match(/^\/(en|hi)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(`/${locale}/sign-in?error=invalid_link`, env.NEXT_PUBLIC_SITE_URL)
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL(`/${locale}/sign-in?error=service_unavailable`, env.NEXT_PUBLIC_SITE_URL)
    );
  }

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/${locale}/sign-in?error=expired_link`, env.NEXT_PUBLIC_SITE_URL)
    );
  }

  // Check onboarding status
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at, is_active, role")
      .eq("id", user.id)
      .single();

    if (profile?.is_active === false) {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(
        new URL(`/${locale}/sign-in?error=account_disabled`, env.NEXT_PUBLIC_SITE_URL)
      );
    }

    if (!profile?.onboarding_completed_at) {
      return NextResponse.redirect(
        new URL(`/${locale}/onboarding?next=${encodeURIComponent(safeNext(nextParam, locale))}`, env.NEXT_PUBLIC_SITE_URL)
      );
    }

    // Role-based target if staff or admin
    if (profile.role === "admin" && nextParam === "/dashboard") {
      return NextResponse.redirect(new URL(`/${locale}/admin`, env.NEXT_PUBLIC_SITE_URL));
    }
    if ((profile.role === "consultant" || profile.role === "manager") && nextParam === "/dashboard") {
      return NextResponse.redirect(new URL(`/${locale}/staff`, env.NEXT_PUBLIC_SITE_URL));
    }
  }

  const destination = safeNext(nextParam, locale);
  return NextResponse.redirect(new URL(destination, env.NEXT_PUBLIC_SITE_URL));
}

