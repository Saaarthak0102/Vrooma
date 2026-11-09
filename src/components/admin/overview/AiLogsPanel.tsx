import React from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2, FileEdit, Bot } from "lucide-react";
import { requireRole } from "@/server/auth/viewer";
import { listAiActivity, listAiReplyAudit } from "@/server/repositories/ai-logs";
import { AiActivityPanel } from "@/components/admin/overview/AiActivityPanel";


const whenFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const VIEWS = [
  { id: "activity", label: "All activity" },
  { id: "replies", label: "Draft vs sent" },
] as const;

export type AiLogView = (typeof VIEWS)[number]["id"];

export function pickAiView(raw: string | string[] | undefined): AiLogView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "replies" ? "replies" : "activity";
}

export async function AiLogsPanel({ view = "activity" }: { view?: AiLogView }) {
  // Defence in depth behind middleware and the admin layout.
  await requireRole("admin");

  const switcher = (
    <nav aria-label="AI log views" className="flex flex-wrap items-center gap-2">
      {VIEWS.map((v) => (
        <Link
          key={v.id}
          href={`/admin?tab=ai&view=${v.id}` as any}
          aria-current={v.id === view ? "page" : undefined}
          className={`inline-flex h-11 items-center rounded-md px-4 text-xs font-bold transition-colors ${
            v.id === view ? "bg-dark text-white" : "border border-border bg-surface text-ink-soft hover:bg-ink/5 hover:text-ink"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );

  if (view === "activity") {
    const data = await listAiActivity();
    return (
      <div className="space-y-5">
        <div className="pb-4 border-b border-border">
          <h1 className="text-2xl font-black text-ink">AI activity</h1>
          <p className="text-xs text-ink-soft">
            Every call to the AI model: buyer chat, lead briefings, next steps, digests and price notes. Tap a card,
            a feature or a row to look closer. Only redacted descriptions are stored, never phone numbers or
            registration numbers.
          </p>
        </div>
        {switcher}
        <AiActivityPanel rows={data.rows} truncated={data.truncated} settings={data.settings} generatedAt={new Date().toISOString()} />
      </div>
    );
  }

  const { entries, summary } = await listAiReplyAudit();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-black text-ink">AI Copilot Transparency Logs</h1>
        <p className="text-xs text-ink-soft">
          Every AI first-reply draft against what the consultant actually sent. Discount wording is blocked
          before sending, so any edit here is a human correction.
        </p>
      </div>
      {switcher}

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Drafts generated", value: summary.draftsGenerated },
          { label: "Replies sent", value: summary.repliesSent },
          { label: "Edited by consultant", value: summary.repliesEdited },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <dt className="text-[11px] font-medium text-ink-mute">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-black text-ink tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {entries.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-8 w-8 text-ink-mute stroke-[1.5]" />}
          title="No replies sent yet"
          description="Once consultants start answering leads, each AI draft and the final message will appear here."
          action={
            <Link href="/staff" className="inline-flex min-h-11 items-center text-xs font-semibold text-accent underline">
              Open the lead inbox
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Customer / Lead</TableHead>
                <TableHead className="text-xs w-2/5">AI Generated Draft</TableHead>
                <TableHead className="text-xs w-2/5">Final Consultant Sent Message</TableHead>
                <TableHead className="text-xs">Audit Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((log) => (
                <TableRow key={log.id} className="text-xs">
                  <TableCell className="font-semibold text-ink">
                    <div>
                      {log.leadId ? (
                        <Link href={`/staff?lead=${log.leadId}`} className="hover:underline">
                          {log.customerName ?? "Unknown buyer"}
                        </Link>
                      ) : (
                        <span>{log.customerName ?? "Deleted lead"}</span>
                      )}
                      <span className="text-[10px] text-ink-mute block font-mono">
                        {log.leadRef ?? "—"} · {whenFmt.format(new Date(log.createdAt))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-ink-soft leading-relaxed italic">
                    &ldquo;{log.draft}&rdquo;
                  </TableCell>
                  <TableCell className="text-ink leading-relaxed font-medium">
                    &ldquo;{log.finalSent}&rdquo;
                  </TableCell>
                  <TableCell>
                    {log.edited ? (
                      <Badge variant="warn" className="text-[10px] gap-1">
                        <FileEdit className="h-3 w-3" />
                        <span>Edited by Consultant</span>
                      </Badge>
                    ) : (
                      <Badge variant="ok" className="text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Sent Verbatim</span>
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
