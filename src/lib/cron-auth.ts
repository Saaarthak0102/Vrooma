import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Local-development fallback. Never honoured when APP_ENV=production. */
export const DEV_CRON_SECRET = "vrooma-cron-secret-local";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Shared bearer-secret check for every /api/cron/* route.
 * Returns a ready-to-send error response, or null when the caller is authorised.
 *
 *  - production + CRON_SECRET unset -> 503 (fail closed, the known dev default is NOT accepted)
 *  - non-production + CRON_SECRET unset -> the local dev default is accepted so `pnpm dev` works
 *  - wrong / missing bearer -> 401
 */
export function authorizeCron(request: Request): NextResponse | null {
  const configured = (env.CRON_SECRET || "").trim();
  const isProduction = env.APP_ENV === "production";

  if (!configured && isProduction) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured on this deployment" },
      { status: 503 }
    );
  }

  const expected = configured || DEV_CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!header || !safeEqual(header, `Bearer ${expected}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron execution" }, { status: 401 });
  }
  return null;
}
