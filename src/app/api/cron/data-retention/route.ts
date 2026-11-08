import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/cron-auth";
import { RETENTION_POLICIES, retentionCutoff } from "@/server/privacy/retention";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const denied = authorizeCron(request);
    if (denied) return denied;

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database client unavailable" }, { status: 500 });
    }

    const now = Date.now();
    const stats = {
      anonymizedLeads: 0,
      purgedOutbox: 0,
      purgedIdempotency: 0,
      purgedCallLogs: 0,
      purgedChats: 0,
      purgedAiLogs: 0,
      purgedLeadTasks: 0,
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

    // 3b. Purge call logs past their retention period (masked numbers only, but not needed forever)
    const callCutoff = new Date(now - RETENTION_POLICIES.CALL_LOG_PURGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: delCalls } = await admin.from("call_logs").delete().lte("started_at", callCutoff).select("id");
    stats.purgedCallLogs = (delCalls || []).length;

    // 3c. Purge support chats idle for 12 months (messages go with them). Buyers can also erase theirs by deleting
    // the account; this covers accounts that stay open.
    const { data: delChats } = await admin
      .from("chat_conversations")
      .delete()
      .lte("last_message_at", retentionCutoff(now, RETENTION_POLICIES.CHAT_PURGE_DAYS))
      .select("id");
    stats.purgedChats = (delChats || []).length;

    // 3d. Purge AI call records: 90 days for the call log, 12 months for the draft-versus-sent reply audit.
    const { data: delAi } = await admin
      .from("ai_logs")
      .delete()
      .not("action", "in", "(reply_sent_unedited,reply_sent_edited)")
      .lte("created_at", retentionCutoff(now, RETENTION_POLICIES.AI_LOG_PURGE_DAYS))
      .select("id");
    const { data: delAudit } = await admin
      .from("ai_logs")
      .delete()
      .in("action", ["reply_sent_unedited", "reply_sent_edited"])
      .lte("created_at", retentionCutoff(now, RETENTION_POLICIES.AI_REPLY_AUDIT_PURGE_DAYS))
      .select("id");
    stats.purgedAiLogs = (delAi || []).length + (delAudit || []).length;

    // 3e. Purge finished or dismissed lead tasks after 6 months (open tasks are never touched).
    const { data: delTasks } = await (admin as any)
      .from("lead_tasks")
      .delete()
      .in("status", ["done", "dismissed"])
      .lte("created_at", retentionCutoff(now, RETENTION_POLICIES.LEAD_TASK_PURGE_DAYS))
      .select("id");
    stats.purgedLeadTasks = (delTasks || []).length;

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
