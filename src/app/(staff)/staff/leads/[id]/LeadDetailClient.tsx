"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lead, Profile, Role } from "@/types/domain";
import type { LeadEventView } from "@/server/repositories/leads";
import { SlaTimer } from "@/components/staff/SlaTimer";
import { StatusPill } from "@/components/staff/StatusPill";
import { AiSummaryCard } from "@/components/staff/AiSummaryCard";
import { ReplyDraftEditor } from "@/components/staff/ReplyDraftEditor";
import { ReassignDialog } from "@/components/staff/ReassignDialog";
import { LeadStatusControl } from "@/components/staff/LeadStatusControl";
import { LeadTimeline } from "@/components/staff/LeadTimeline";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail } from "lucide-react";

interface LeadDetailClientProps {
  initialLead: Lead;
  consultants: Profile[];
  events: LeadEventView[];
  viewerRole: Role;
}

export function LeadDetailClient({ initialLead, consultants, events, viewerRole }: LeadDetailClientProps) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const router = useRouter();
  // The timeline is server-rendered from lead_events; re-fetch it after any change.
  const refreshTimeline = () => router.refresh();

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/staff/leads"
          className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Inbox</span>
        </Link>
        <div className="flex items-center gap-2">
          <ReassignDialog
            leadId={lead.id}
            consultants={consultants}
            currentAssignedId={lead.assigned_to}
            onReassigned={() => {
              refreshTimeline();
            }}
          />
        </div>
      </div>

      {/* SLA Hero Alert Banner */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-mute uppercase font-bold tracking-wider">
                Lead Dossier · Ref: {lead.id.slice(0, 8)}
              </span>
              <StatusPill status={lead.status} />
              <Badge variant="secondary" className="capitalize text-[10px]">
                {lead.source}
              </Badge>
            </div>
            <h1 className="text-2xl font-black text-ink mt-1">{lead.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <SlaTimer
              dueAt={lead.sla_due_at}
              firstContactedAt={lead.first_contacted_at}
            />
          </div>
        </div>

        {/* Customer Contact & Vehicle Line Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div className="space-y-1">
            <span className="text-[11px] text-ink-mute block font-medium">Customer Phone</span>
            <a
              href={`tel:${lead.phone}`}
              className="font-bold text-accent-ink flex items-center gap-1.5 hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{lead.phone}</span>
            </a>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-ink-mute block font-medium">Email Address</span>
            <span className="font-medium text-ink flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-ink-soft" />
              <span>{lead.email || "Not provided"}</span>
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-ink-mute block font-medium">Vehicle of Interest</span>
            <span className="font-bold text-ink">
              {lead.model_name || "General Passenger Line"}
            </span>
          </div>
        </div>

        {lead.message && (
          <div className="rounded-lg bg-bg-sheen/60 p-3 border border-border/60 text-xs">
            <span className="font-bold text-ink-soft block mb-0.5">Customer Note:</span>
            <p className="text-ink italic">&ldquo;{lead.message}&rdquo;</p>
          </div>
        )}
      </div>

      {/* One-step stage change (Lost asks for a reason) */}
      <LeadStatusControl
        leadId={lead.id}
        status={lead.status}
        viewerRole={viewerRole}
        onChanged={(status) => {
          setLead((prev) => ({
            ...prev,
            status,
            first_contacted_at:
              prev.first_contacted_at ||
              (status === "new" || status === "lost" ? prev.first_contacted_at : new Date().toISOString()),
          }));
          refreshTimeline();
        }}
      />

      {/* AI Buyer Briefing / Summariser */}
      <AiSummaryCard
        summary={lead.ai_summary}
        customerName={lead.name}
      />

      {/* AI First-Reply Composer (With Hard Discount Filter Guard) */}
      <ReplyDraftEditor
        leadId={lead.id}
        customerName={lead.name}
        leadPhone={lead.phone}
        initialDraft={lead.ai_draft || ""}
        onSent={() => {
          setLead((prev) => ({
            ...prev,
            status: "contacted",
            first_contacted_at: prev.first_contacted_at || new Date().toISOString(),
          }));
          refreshTimeline();
        }}
      />

      {/* Audit timeline from lead_events */}
      <LeadTimeline events={events} />
    </div>
  );
}

