import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// English only: there is no locale routing. The middleware only refreshes the auth session and applies the
// route guards for the protected areas.
export default async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Everything except API routes, the /auth/* route handler (email-link confirm),
  // internal Next.js assets, public images and files.
  matcher: ["/", "/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
