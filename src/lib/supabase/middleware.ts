import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeNext } from "@/server/auth/safe-next";

/**
 * List of paths that require auth check and session cookie refresh.
 * Public routes (cars, used-cars, offers, showrooms, legal) are omitted
 * to ensure ISR caching is never broken by reading or setting cookies.
 */
const PROTECTED_PATH_PATTERNS = [
  /^\/(en|hi)?\/?dashboard(\/|$)/,
  /^\/(en|hi)?\/?profile(\/|$)/,
  /^\/(en|hi)?\/?staff(\/|$)/,
  /^\/(en|hi)?\/?admin(\/|$)/,
  /^\/(en|hi)?\/?onboarding(\/|$)/,
  /^\/(en|hi)?\/?sign-in(\/|$)/,
  /^\/(en|hi)?\/?sign-up(\/|$)/,
];

export function isSessionRequiredPath(pathname: string): boolean {
  return PROTECTED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

export async function updateSession(request: NextRequest, initialResponse?: NextResponse) {
  let response = initialResponse || NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    return response;
  }

  let cookiesUpdated = false;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesUpdated = true;
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // If auth cookies were updated, send Cache-Control: private, no-store
  if (cookiesUpdated) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  const pathname = request.nextUrl.pathname;

  // Extract locale from pathname (default 'en')
  const localeMatch = pathname.match(/^\/(en|hi)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";

  // Check auth for protected paths
  if (isSessionRequiredPath(pathname)) {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Inactive account check
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active, onboarding_completed_at")
        .eq("id", user.id)
        .single();

      if (profile?.is_active === false) {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL(`/${locale}/sign-in?error=account_disabled`, request.url));
      }

      // If user is already on sign-in or sign-up, redirect them away
      const isAuthPage = /^\/(en|hi)?\/?sign-(in|up)(\/|$)/.test(pathname);
      if (isAuthPage) {
        if (!profile?.onboarding_completed_at) {
          return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
        }
        if (profile.role === "admin") {
          return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
        }
        if (profile.role === "consultant" || profile.role === "manager") {
          return NextResponse.redirect(new URL(`/${locale}/staff`, request.url));
        }
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
      }

      // Onboarding page check
      const isOnboardingPage = /^\/(en|hi)?\/?onboarding(\/|$)/.test(pathname);
      if (isOnboardingPage && profile?.onboarding_completed_at) {
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
      }

      // If accessing dashboard or profile with incomplete profile -> onboarding
      const isDashboardOrProfile = /^\/(en|hi)?\/?(dashboard|profile)(\/|$)/.test(pathname);
      if (isDashboardOrProfile && !profile?.onboarding_completed_at) {
        return NextResponse.redirect(
          new URL(`/${locale}/onboarding?next=${encodeURIComponent(safeNext(pathname, locale))}`, request.url)
        );
      }

      // Staff route guard: requires consultant, manager, or admin
      const isStaffRoute = /^\/(en|hi)?\/?staff(\/|$)/.test(pathname);
      if (isStaffRoute) {
        if (!["consultant", "manager", "admin"].includes(profile?.role || "")) {
          // Return 403 Forbidden
          return new NextResponse("403 Forbidden: Staff Access Required", { status: 403 });
        }
      }

      // Admin route guard: requires admin
      const isAdminRoute = /^\/(en|hi)?\/?admin(\/|$)/.test(pathname);
      if (isAdminRoute) {
        if (profile?.role !== "admin") {
          return new NextResponse("403 Forbidden: Admin Access Required", { status: 403 });
        }
      }
    } else {
      // Unauthenticated visitor trying to access dashboard, profile, staff, admin, onboarding
      const requiresAuth = /^\/(en|hi)?\/?(dashboard|profile|staff|admin|onboarding)(\/|$)/.test(pathname);
      if (requiresAuth) {
        return NextResponse.redirect(
          new URL(`/${locale}/sign-in?next=${encodeURIComponent(safeNext(pathname, locale))}`, request.url)
        );
      }
    }
  }

  return response;
}
