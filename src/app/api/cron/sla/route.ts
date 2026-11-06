import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = env.CRON_SECRET || "vrooma-cron-secret-local";

  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron execution" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: breachCount, error } = await admin.rpc("flag_sla_breaches");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        checkedAt: new Date().toISOString(),
        breachedCount: breachCount || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const POST = GET;
