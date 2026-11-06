import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { RETENTION_POLICIES } from "@/server/privacy/retention";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = env.CRON_SECRET || "vrooma-cron-secret-local";

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database client unavailable" }, { status: 500 });
    }

    const now = Date.now();
    const stats = {
      anonymizedLeads: 0,
      purgedOutbox: 0,
      purgedIdempotency: 0,
    };

    // 1. Purge expired idempotency keys (> 7 days)
    const idempotencyCutoff = new Date(now - RETENTION_POLICIES.IDEMPOTENCY_PURGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: delIdempotency } = await admin
      .from("idempotency_keys")
      .delete()
      .lte("created_at", idempotencyCutoff)
      .select("key");

    stats.purgedIdempotency = (delIdempotency || []).length;

    // 2. Purge old delivered/dead messages (> 90 days)
    const outboxCutoff = new Date(now - RETENTION_POLICIES.OUTBOX_PURGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: delOutbox } = await admin
      .from("messages_outbox")
      .delete()
      .in("status", ["sent", "dead"])
      .lte("created_at", outboxCutoff)
      .select("id");

    stats.purgedOutbox = (delOutbox || []).length;

    // 3. Anonymize closed leads older than 24 months
    const leadCutoff = new Date(now - RETENTION_POLICIES.LEAD_ANONYMIZATION_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldLeads } = await admin
      .from("leads")
      .select("id")
      .in("status", ["won", "lost"])
      .lte("created_at", leadCutoff);

    if (oldLeads && oldLeads.length > 0) {
      const { error: anonLeadsErr } = await admin
        .from("leads")
        .update({
          name: "Archived Customer",
          phone: "+919999999999",
          email: null,
          message: "[REDACTED - STATUTORY RETENTION EXPIRED]",
        })
        .in("id", oldLeads.map((l) => l.id));

      if (!anonLeadsErr) {
        stats.anonymizedLeads = oldLeads.length;
      }
    }

    // 4. Record non-personal audit event
    try {
      await admin.from("audit_log").insert({
        table_name: "data_retention_job",
        record_id: new Date().toISOString().split("T")[0],
        action: "DATA_RETENTION_EXECUTED",
        new_values: stats,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      data: stats,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

export const GET = POST;
