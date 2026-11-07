import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { requireRole, requireUser } from "@/server/auth/viewer";
import { authorizeCron } from "@/lib/cron-auth";
import { verifyRequestOrigin } from "@/lib/security";
import type { Profile, Role } from "@/types/domain";

export type GuardResult =
  | { ok: true; user: { id: string; email: string }; profile: Profile | null }
  | { ok: false; response: NextResponse };

function toResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status: err.httpStatus });
  }
  return NextResponse.json({ ok: false, error: "Authorization failed" }, { status: 401 });
}

/** Route-handler guard: any signed-in user. Never trust an id supplied by the client; use `user.id`. */
export async function guardUser(): Promise<GuardResult> {
  try {
    const { user, profile } = await requireUser();
    return { ok: true, user, profile };
  } catch (err) {
    return { ok: false, response: toResponse(err) };
  }
}

/** Route-handler guard: signed-in user with an active, completed profile and one of the given roles. */
export async function guardRole(...roles: Role[]): Promise<GuardResult> {
  try {
    const { user, profile } = await requireRole(...roles);
    return { ok: true, user, profile };
  } catch (err) {
    return { ok: false, response: toResponse(err) };
  }
}

/**
 * Route-handler guard for machine-or-admin endpoints: a valid CRON_SECRET bearer, or an admin session.
 * Returns null when authorised, otherwise a ready response.
 */
export async function guardCronOrAdmin(request: Request): Promise<NextResponse | null> {
  if ((request.headers.get("authorization") ?? "").startsWith("Bearer ")) {
    return authorizeCron(request);
  }
  const session = await guardRole("admin");
  return session.ok ? null : session.response;
}

/**
 * CSRF guard for cookie-authenticated mutating routes: rejects cross-site requests (Sec-Fetch-Site / Origin).
 * Same-origin browsers and server-to-server callers (no Origin header) pass. Returns null when allowed.
 */
export function guardOrigin(request: NextRequest): NextResponse | null {
  if (verifyRequestOrigin(request)) return null;
  return NextResponse.json({ ok: false, error: "Cross-site request blocked." }, { status: 403 });
}
