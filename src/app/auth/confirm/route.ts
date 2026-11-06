import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Email links land here. This handler deliberately does NOT verify the token on GET:
 * mail scanners (Outlook SafeLinks, antivirus) open every link, and verification tokens are single-use.
 * It forwards to the confirm page, where the user presses a button; that button calls the
 * confirmEmailLink server action (src/server/auth/signup-link.ts), which verifies and routes to onboarding.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextParam = requestUrl.searchParams.get("next") || "/dashboard";

  const localeMatch = nextParam.match(/^\/(en|hi)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in?error=invalid_link`, env.NEXT_PUBLIC_SITE_URL));
  }

  const target = new URL(`/${locale}/verify-email`, env.NEXT_PUBLIC_SITE_URL);
  target.searchParams.set("token_hash", tokenHash);
  target.searchParams.set("type", type);
  target.searchParams.set("next", nextParam);
  return NextResponse.redirect(target);
}
