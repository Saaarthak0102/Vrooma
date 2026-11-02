import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  // TODO(day-3): Exchange code with Supabase auth session
  return NextResponse.redirect(new URL(next, request.url));
}
