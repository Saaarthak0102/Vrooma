import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageShell } from "@/components/layout/PageShell";
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

export const dynamic = "force-dynamic";

export default async function AdminSystemHealthPage() {
  const admin = createAdminClient();

  const [
    { count: pendingOutbox },
    { count: deadOutbox },
    { count: sentOutbox },
    { count: breachedLeads },
    { count: pendingDataRequests },
    { data: recentCronLogs },
    { data: recentImports },
  ] = await Promise.all([
    admin.from("messages_outbox").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("messages_outbox").select("*", { count: "exact", head: true }).eq("status", "dead"),
    admin.from("messages_outbox").select("*", { count: "exact", head: true }).eq("status", "sent"),
    admin.from("leads").select("*", { count: "exact", head: true }).gt("sla_breached_at", "1970-01-01"),
    admin.from("data_requests").select("*", { count: "exact", head: true }).eq("status", "received"),
    admin.from("audit_log").select("action, new_values, created_at").ilike("action", "%CRON%").order("created_at", { ascending: false }).limit(6),
    admin.from("csv_imports").select("filename, rows_count, created_at").order("created_at", { ascending: false }).limit(4),
  ]);

  const hasDeadLetters = (deadOutbox || 0) > 0;
  const hasBreaches = (breachedLeads || 0) > 0;

  return (
    <PageShell
      title="System Health & Observability"
      subtitle="Dealership background pipeline monitors, outbox queue depths, and statutory DPDP queues."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "System Health" }]}
    >
      <div className="space-y-6">
        {/* Dealership Vital Signs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-mute">
              <span>Outbox Pending</span>
              <Mail className="h-4 w-4 text-ink-soft" />
            </div>
            <div className="text-2xl font-bold text-ink">{pendingOutbox || 0}</div>
            <p className="text-[11px] text-ink-mute">{sentOutbox || 0} dispatched successfully</p>
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
    </PageShell>
  );
}

