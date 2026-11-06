import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const denied = authorizeCron(request);
    if (denied) return denied;

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database client unavailable" }, { status: 500 });
    }

    // 7-day statutory cooling-off grace period under DPDP Act 2023
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: eligibleRequests, error: reqErr } = await admin
      .from("data_requests")
      .select("id, user_id, created_at")
      .eq("kind", "delete")
      .eq("status", "received")
      .lte("created_at", cutoffDate);

    if (reqErr) {
      console.warn(`[cron/finalize-deletions] Failed to query deletion requests: ${reqErr.message}`);
      return NextResponse.json({ ok: false, error: reqErr.message }, { status: 500 });
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const req of eligibleRequests || []) {
      try {
        // 1. Call database anonymization RPC
        const { error: anonErr } = await admin.rpc("anonymise_user", {
          p_uid: req.user_id,
        });

        if (anonErr) {
          throw new Error(`RPC anonymise_user failed: ${anonErr.message}`);
        }

        // 2. Remove user from Supabase Auth service
        try {
          await admin.auth.admin.deleteUser(req.user_id);
        } catch (authErr: any) {
          console.warn(`[cron/finalize-deletions] Auth deletion note for ${req.user_id}: ${authErr?.message}`);
        }

        processedCount++;
      } catch (err: any) {
        console.error(`[cron/finalize-deletions] Failed processing user ${req.user_id}:`, err);
        errors.push(`${req.user_id}: ${err?.message}`);
      }
    }

    // Log non-PII audit record
    try {
      await admin.from("audit_log").insert({
        table_name: "data_requests",
        record_id: `batch-${Date.now()}`,
        action: "CRON_FINALIZED_DELETIONS",
        new_values: {
          processed_count: processedCount,
          eligible_count: (eligibleRequests || []).length,
          cutoff: cutoffDate,
        },
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      data: {
        processedCount,
        errorsCount: errors.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

export const GET = POST;
