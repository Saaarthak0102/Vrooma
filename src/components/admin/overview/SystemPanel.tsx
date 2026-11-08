import React from "react";
import { HEARTBEAT_FOR_JOB, HEARTBEAT_MAX_AGE_MIN, heartbeatState } from "@/lib/cron-heartbeat";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  Mail,
  Clock,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Database,
} from "lucide-react";


/** Every job the platform expects to exist. A missing one is shown as "not scheduled", never silently hidden. */
const EXPECTED_JOBS: { name: string; label: string; needsVault?: boolean }[] = [
  { name: "eval_lead_sla_breaches", label: "SLA check (every minute)" },
  { name: "process_outbox_queue", label: "Outbox processing (every minute)", needsVault: true },
  { name: "process_automations", label: "Reminders and alerts (every 5 minutes)", needsVault: true },
  { name: "daily_digests", label: "Daily staff digests (08:30 IST)", needsVault: true },
  { name: "daily_data_retention", label: "Data retention (daily)", needsVault: true },
  { name: "daily_finalize_deletions", label: "Finalise deletions (daily)", needsVault: true },
  { name: "daily_dms_export", label: "DMS daily CSV export (00:15 IST)", needsVault: true },
  { name: "daily_slot_generation", label: "Slot generation (daily)" },
  { name: "purge_expired_idempotency", label: "Purge idempotency keys (daily)" },
  { name: "purge_stale_rate_limits", label: "Purge rate limits (daily)" },
];

function formatRunTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }) + " IST";
}

export async function SystemPanel() {
  const admin = createAdminClient();

  const [
    { count: pendingOutbox },
    { count: deadOutbox },
    { count: sentOutbox },
    { count: skippedOutbox },
    { count: breachedLeads },
    { count: pendingDataRequests },
    { data: recentCronLogs },
    { data: recentImports },
    cronStatusResult,
    { count: webhookCalls },
  ] = await Promise.all([
    admin.from("messages_outbox").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("messages_outbox").select("*", { count: "exact", head: true }).eq("status", "dead"),
    admin.from("messages_outbox").select("*", { count: "exact", head: true }).eq("status", "sent"),
    // "skipped" exists after migration 0030; the generated DB types predate it.
    admin.from("messages_outbox").select("*", { count: "exact", head: true }).eq("status", "skipped" as never),
    admin.from("leads").select("*", { count: "exact", head: true }).gt("sla_breached_at", "1970-01-01"),
    admin.from("data_requests").select("*", { count: "exact", head: true }).eq("status", "received"),
    admin.from("audit_log").select("action, new_values, created_at").ilike("action", "%CRON%").order("created_at", { ascending: false }).limit(6),
    admin.from("csv_imports").select("filename, rows_count, created_at").order("created_at", { ascending: false }).limit(4),
    admin.rpc("get_cron_status"),
    // Calls received from a telephony vendor (manual staff entries have another source).
    (admin as any).from("call_logs").select("*", { count: "exact", head: true }).eq("source", "webhook"),
  ]);

  // Presence only: secrets are never rendered.
  const integrations: { label: string; connected: boolean; detail: string }[] = [
    {
      label: "Email (Resend)",
      connected: Boolean(process.env.RESEND_API_KEY),
      detail: process.env.RESEND_API_KEY ? "Sending from " + (process.env.EMAIL_FROM || "default sender") : "Add RESEND_API_KEY and EMAIL_FROM",
    },
    {
      label: "WhatsApp (Meta Cloud API)",
      connected: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
      detail:
        process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID
          ? "Connected"
          : "Not connected: replies and notices go by email. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID and redeploy to add WhatsApp",
    },
    {
      label: "Telephony (call tracking)",
      connected: (webhookCalls || 0) > 0,
      detail:
        (webhookCalls || 0) > 0
          ? `${webhookCalls} calls received from your vendor`
          : "Connect a telephony vendor (Exotel, Knowlarity...) and point it at /api/webhooks/calls. Staff can log calls by hand meanwhile.",
    },
  ];

  // Heartbeats (migration 0038): when each HTTP job last actually reached the app. pg_cron says "succeeded" even
  // when the app answers 401/404, so this is the real signal. Unavailable table = migration not applied yet.
  const heartbeatResult = await (admin as any).from("cron_heartbeats").select("job, last_received_at");
  const heartbeatsAvailable = !heartbeatResult.error;
  const heartbeatByJob = new Map<string, string>(
    ((heartbeatResult.data ?? []) as { job: string; last_received_at: string }[]).map((h) => [h.job, h.last_received_at]),
  );

  // get_cron_status needs migration 0018; until it is applied show "status unavailable" rather than failing the page.
  const cronStatusAvailable = !cronStatusResult.error;
  const cronByName = new Map((cronStatusResult.data ?? []).map((j) => [j.jobname, j]));

  const hasDeadLetters = (deadOutbox || 0) > 0;
  const hasBreaches = (breachedLeads || 0) > 0;

  return (
    <div>
      <div className="space-y-6">
        {/* Dealership Vital Signs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-mute">
              <span>Outbox Pending</span>
              <Mail className="h-4 w-4 text-ink-soft" />
            </div>
            <div className="text-2xl font-bold text-ink">{pendingOutbox || 0}</div>
            <p className="text-[11px] text-ink-mute">
              {sentOutbox || 0} delivered{(skippedOutbox || 0) > 0 ? ` · ${skippedOutbox} skipped (no provider)` : ""}
            </p>
          </Card>

          <Card className={`p-4 space-y-2 ${hasDeadLetters ? "border-danger bg-danger/5" : ""}`}>
            <div className="flex items-center justify-between text-xs font-semibold text-ink-mute">
              <span>Dead Letters</span>
              <AlertTriangle className={`h-4 w-4 ${hasDeadLetters ? "text-danger" : "text-ink-soft"}`} />
            </div>
            <div className={`text-2xl font-bold ${hasDeadLetters ? "text-danger" : "text-ink"}`}>
              {deadOutbox || 0}
            </div>
            <p className="text-[11px] text-ink-mute">
              {hasDeadLetters ? "Exceeded 5 retry attempts" : "All outbox items healthy"}
            </p>
          </Card>

          <Card className={`p-4 space-y-2 ${hasBreaches ? "border-warning bg-warning/5" : ""}`}>
            <div className="flex items-center justify-between text-xs font-semibold text-ink-mute">
              <span>SLA Breaches</span>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div className="text-2xl font-bold text-ink">{breachedLeads || 0}</div>
            <p className="text-[11px] text-ink-mute">Enquiries past 5-min threshold</p>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-mute">
              <span>Pending DPDP Requests</span>
              <ShieldCheck className="h-4 w-4 text-accent-ink" />
            </div>
            <div className="text-2xl font-bold text-ink">{pendingDataRequests || 0}</div>
            <p className="text-[11px] text-ink-mute">30-day statutory resolution target</p>
          </Card>
        </div>

        {/* Integrations: what is connected and what still needs an account */}
        <Card className="p-5 space-y-3" data-testid="integrations">
          <h3 className="text-sm font-bold text-ink">Integrations</h3>
          {integrations.map((i) => (
            <div key={i.label} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-stone-50 border border-border/80 text-xs">
              <div>
                <div className="font-medium text-ink">{i.label}</div>
                <div className="text-[11px] text-ink-mute">{i.detail}</div>
              </div>
              <Badge variant={i.connected ? "secondary" : "outline"} className="text-[10px] shrink-0">
                {i.connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
          ))}
        </Card>

        {/* Two-Column Monitor Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cron Pipeline Execution Logs */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-ink" />
                <h3 className="text-sm font-bold text-ink">Recent Cron Routine Executions</h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Auto-Monitored
              </Badge>
            </div>

            {/* Last run per scheduled job (pg_cron). */}
            <div className="space-y-2" data-testid="cron-last-run">
              {EXPECTED_JOBS.map((job) => {
                const row = cronByName.get(job.name);
                let state: string;
                let tone = "text-ink-mute";
                if (!cronStatusAvailable) {
                  state = "status unavailable";
                } else if (!row) {
                  state = job.needsVault ? "not scheduled (add Vault secrets)" : "not scheduled";
                  tone = "text-danger";
                } else if (row.last_status && row.last_status !== "succeeded") {
                  state = `${row.last_status} ${formatRunTime(row.last_run_at)}`;
                  tone = "text-danger";
                } else {
                  state = `last run ${formatRunTime(row.last_run_at)}`;
                }
                const heartbeatKey = HEARTBEAT_FOR_JOB[job.name];
                if (cronStatusAvailable && row && heartbeatKey && heartbeatsAvailable) {
                  const received = heartbeatByJob.get(heartbeatKey) ?? null;
                  const hb = heartbeatState(received, HEARTBEAT_MAX_AGE_MIN[heartbeatKey]);
                  if (hb !== "ok") {
                    state = received
                      ? `scheduled, but the app has not received it since ${formatRunTime(received)}`
                      : "scheduled, but the app has never received it (check app_url and CRON_SECRET)";
                    tone = "text-danger";
                  } else {
                    state = `${state} · received ${formatRunTime(received)}`;
                  }
                }
                // A status dot beside the words, so a problem is visible at a glance and not by colour alone.
                const dot = tone === "text-danger" ? "bg-danger" : !cronStatusAvailable ? "bg-ink-mute" : "bg-ok";
                return (
                  <div
                    key={job.name}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-stone-50 border border-border/80 text-xs transition-colors [@media(hover:hover)_and_(pointer:fine)]:hover:border-black/20"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                      <span className="truncate">{job.label}</span>
                    </span>
                    <span className={`text-[11px] font-mono text-right ${tone}`}>{state}</span>
                  </div>
                );
              })}
            </div>

            {(!recentCronLogs || recentCronLogs.length === 0) ? (
              <div className="py-6 text-center text-xs text-ink-mute">
                No recent cron execution logs registered yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentCronLogs.map((log: any, idx: number) => {
                  const dateStr = new Date(log.created_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: "Asia/Kolkata",
                  });

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-border/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        <span className="font-mono font-medium text-ink">{log.action}</span>
                      </div>
                      <span className="text-[11px] font-mono text-ink-mute">{dateStr} IST</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Bulk Ingestion History */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-accent-ink" />
                <h3 className="text-sm font-bold text-ink">Recent Portal CSV Ingestions</h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                PapaParse Stream
              </Badge>
            </div>

            {(!recentImports || recentImports.length === 0) ? (
              <div className="py-6 text-center text-xs text-ink-mute">
                No CSV imports recorded in the current billing cycle.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentImports.map((imp: any, idx: number) => {
                  const dateStr = new Date(imp.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    timeZone: "Asia/Kolkata",
                  });

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-border/80 text-xs"
                    >
                      <span className="font-medium text-ink truncate max-w-[200px]">
                        {imp.filename}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {imp.rows_count} rows
                        </Badge>
                        <span className="text-[11px] text-ink-mute">{dateStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

