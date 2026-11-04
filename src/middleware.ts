import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Run internationalization routing first
  const response = handleI18nRouting(request);

  // 2. Run Supabase auth session check and route protection
  return await updateSession(request, response);
}

export const config = {
  // Match all pathnames except internal Next.js assets, public images and files
  matcher: ["/", "/(hi|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
