"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SlaTimer } from "@/components/staff/SlaTimer";
import { StatusPill } from "@/components/staff/StatusPill";
import { AiSummaryCard } from "@/components/staff/AiSummaryCard";
import { ReplyDraftEditor } from "@/components/staff/ReplyDraftEditor";
import { ReassignDialog } from "@/components/staff/ReassignDialog";
import { LeadStatusControl } from "@/components/staff/LeadStatusControl";
import { LeadTimeline } from "@/components/staff/LeadTimeline";
import { getLeadDrawerAction, refreshLeadCopilotAction, type LeadDrawerData } from "@/server/actions/lead-drawer";
import type { LeadAiProfile } from "@/server/ai/lead-context";
import { toast } from "sonner";
import type { Lead, Role } from "@/types/domain";

export interface LeadDrawerProps {
  leadId: string | null;
  viewerRole: Role;
  onClose: () => void;
  /** Called whenever the lead changes here, so the grid row stays in sync. */
  onLeadChanged: (patch: Partial<Lead> & { id: string }) => void;
}

/** The single-record workspace for a lead: brief, reply, stage, reassign, activity. No separate page. */
export function LeadDrawer({ leadId, viewerRole, onClose, onLeadChanged }: LeadDrawerProps) {
  const [data, setData] = useState<LeadDrawerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (id: string) => {
    const res = await getLeadDrawerAction(id);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Could not load this lead.");
    }
  }, []);

  useEffect(() => {
    setData(null);
    setError(null);
    if (leadId) void load(leadId);
  }, [leadId, load]);

  const lead = data?.lead;

  const refreshBriefing = useCallback(async (id: string) => {
    setRefreshing(true);
    try {
      const res = await refreshLeadCopilotAction(id);
      if (res.ok) {
        setData((current) => (current ? { ...current, lead: res.data.lead } : current));
      } else {
        toast.error(res.error?.message ?? "Could not refresh the briefing.");
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <Sheet open={Boolean(leadId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full space-y-4 sm:max-w-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="pr-6 text-lg font-black">{lead?.name ?? "Lead"}</SheetTitle>
          <SheetDescription className="text-xs">
            {lead ? `${lead.ref ?? lead.id.slice(0, 8)} · ${lead.model_name || "General enquiry"}` : "Loading lead…"}
          </SheetDescription>
        </SheetHeader>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </p>
        )}

        {!lead && !error && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-20 w-full bg-border" />
            <Skeleton className="h-32 w-full bg-border" />
            <Skeleton className="h-40 w-full bg-border" />
          </div>
        )}

        {lead && data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={lead.status} />
              <Badge variant="secondary" className="text-[10px] capitalize">
                {lead.source.replace("_", " ")}
              </Badge>
              <SlaTimer dueAt={lead.sla_due_at} firstContactedAt={lead.first_contacted_at} />
              {data.chatId && (
                <Link
                  href={`/staff/chats?chat=${data.chatId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden /> View chat
                </Link>
              )}
              <div className="ml-auto">
                <ReassignDialog
                  leadId={lead.id}
                  consultants={data.consultants}
                  currentAssignedId={lead.assigned_to}
                  onReassigned={() => {
                    void load(lead.id);
                    onLeadChanged({ id: lead.id });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <a href={`tel:${lead.phone}`} className="flex min-h-11 items-center gap-1.5 font-bold text-accent-ink hover:underline">
                <Phone className="h-3.5 w-3.5" />
                {lead.phone}
              </a>
              <span className="flex items-center gap-1.5 text-ink">
                <Mail className="h-3.5 w-3.5 text-ink-soft" />
                {lead.email || "No email"}
              </span>
            </div>

            {lead.message && (
              <p className="rounded-lg border border-border/60 bg-bg-sheen/60 p-3 text-xs italic text-ink">
                &ldquo;{lead.message}&rdquo;
              </p>
            )}

            <LeadStatusControl
              leadId={lead.id}
              status={lead.status}
              viewerRole={viewerRole}
              onChanged={(status) => {
                const firstContacted =
                  lead.first_contacted_at ||
                  (status === "new" || status === "lost" ? lead.first_contacted_at : new Date().toISOString());
                onLeadChanged({ id: lead.id, status, first_contacted_at: firstContacted });
                void load(lead.id);
              }}
            />

            <AiSummaryCard
              summary={lead.ai_summary}
              customerName={lead.name}
              profile={(lead.ai_profile as LeadAiProfile | null) ?? null}
              refreshing={refreshing}
              onRefresh={() => void refreshBriefing(lead.id)}
            />

            <ReplyDraftEditor
              key={`${lead.id}:${lead.ai_draft ?? ""}`}
              leadId={lead.id}
              customerName={lead.name}
              leadPhone={lead.phone}
              initialDraft={lead.ai_draft || ""}
              onSent={() => {
                onLeadChanged({
                  id: lead.id,
                  status: lead.status === "new" ? "contacted" : lead.status,
                  first_contacted_at: lead.first_contacted_at || new Date().toISOString(),
                });
                void load(lead.id);
              }}
            />

            <LeadTimeline events={data.events} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
