import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEMO_LANDING, QUICK_LOGIN_PERSONAS, isDemoRole } from "@/lib/demo-personas";
import { demoLoginEnabled } from "@/lib/demo-mode";
import { getTrustedClientIp } from "@/lib/network";
import { guardOrigin } from "@/server/auth/api-guard";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const MAX_PER_MINUTE_PER_IP = 20;

/**
 * Instant sign-in for the four demo accounts (buyer, consultant, manager, admin), for showing the product.
 *
 * Off unless DEMO_LOGIN=true (404 otherwise, like the dev login). No password exists for these accounts: the server
 * asks the Auth service for a one-time sign-in link for the demo account (nothing is emailed) and redeems it itself,
 * which sets the normal session cookies. Only the nine accounts in src/lib/demo-personas.ts can ever be signed in
 * this way. Every use is recorded in audit_log.
 *
 * There is deliberately no passcode: while the variable is on, anyone with the link can use it. Turn it off after the
 * demo (remove DEMO_LOGIN in the hosting settings and redeploy).
 */
export async function POST(request: NextRequest) {
  if (!demoLoginEnabled()) notFound();

  const blocked = guardOrigin(request);
  if (blocked) return blocked;

  const ip = getTrustedClientIp(request);
  if (!(await rateLimit(`demo_login_${ip}`, MAX_PER_MINUTE_PER_IP, 60))) {
    return NextResponse.json({ ok: false, error: "Too many sign-ins. Please wait a moment." }, { status: 429 });
  }

  let role: unknown;
  try {
    role = (await request.json())?.role;
  } catch {
    return NextResponse.json({ ok: false, error: "Send a JSON body with a role." }, { status: 400 });
  }
  if (!isDemoRole(role)) {
    return NextResponse.json({ ok: false, error: "Invalid role: choose buyer, consultant, manager or admin." }, { status: 400 });
  }
  const persona = QUICK_LOGIN_PERSONAS[role];

  try {
    const admin = createAdminClient();
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: persona.email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      return NextResponse.json(
        { ok: false, error: "The demo account is not set up on this project.", hint: linkError?.message },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ ok: false, error: "Auth client unavailable" }, { status: 500 });
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (error || !data.session) {
      return NextResponse.json({ ok: false, error: "Demo sign-in failed.", hint: error?.message }, { status: 401 });
    }

    // Best effort: a failed audit write must not block the demo, but it is logged.
    const { error: auditError } = await admin.from("audit_log").insert({
      table_name: "demo_login",
      record_id: persona.id,
      action: "DEMO_LOGIN",
      new_values: { role, email: persona.email },
    });
    if (auditError) console.warn(`[demo-login] audit write failed: ${auditError.message}`);

    return NextResponse.json({
      ok: true,
      role,
      destination: DEMO_LANDING[role],
      user: { id: data.user?.id, email: data.user?.email },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
