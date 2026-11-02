"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { Lead } from "@/types/domain";
import { SlaTimer } from "@/components/staff/SlaTimer";
import { StatusPill } from "@/components/staff/StatusPill";
import { AiSummaryCard } from "@/components/staff/AiSummaryCard";
import { ReplyDraftEditor } from "@/components/staff/ReplyDraftEditor";
import { ReassignDialog } from "@/components/staff/ReassignDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, ShieldCheck } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [lead, setLead] = useState<Lead | null>(null);

  useEffect(() => {
    const found = memoryStore.leads.find((l) => l.id === id);
    setLead(found || null);
  }, [id]);

  if (!lead) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-ink">Lead Not Found</h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/staff/leads">Return to Lead Inbox</Link>
        </Button>
      </div>
    );
  }

  const consultants = memoryStore.users.filter((u) => u.role === "consultant");

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
              const updated = memoryStore.leads.find((l) => l.id === id);
              if (updated) setLead({ ...updated });
            }}
          />
        </div>
      </div>

      {/* Main Lead Header Card */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-ink">{lead.name}</h1>
              <StatusPill status={lead.status} />
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Enquiry ID: <span className="font-mono">{lead.id}</span> · Source:{" "}
              <span className="capitalize font-semibold">{lead.source}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SlaTimer dueAt={lead.sla_due_at} firstContactedAt={lead.first_contacted_at} />
          </div>
        </div>

        {/* Contact Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-ink/[0.02] border border-border/60">
            <Phone className="h-4 w-4 text-accent-ink shrink-0" />
            <div>
              <span className="text-[10px] text-ink-mute block">Mobile</span>
              <a href={`tel:+91${lead.phone}`} className="font-bold text-ink hover:underline">
                +91 {lead.phone}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-ink/[0.02] border border-border/60">
            <Mail className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
            <div className="truncate">
              <span className="text-[10px] text-ink-mute block">Email</span>
              <span className="font-semibold text-ink truncate block">
                {lead.email || "Not provided"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-ink/[0.02] border border-border/60">
            <MapPin className="h-4 w-4 text-accent-ink shrink-0" />
            <div>
              <span className="text-[10px] text-ink-mute block">Facility</span>
              <span className="font-semibold text-ink">Hazratganj Flagship</span>
            </div>
          </div>
        </div>

        {/* Vehicle Interest & Note */}
        <div className="pt-2 text-xs space-y-1">
          <span className="text-ink-mute uppercase font-semibold text-[10px] block">
            Customer Message / Notes
          </span>
          <p className="text-ink bg-ink/[0.02] p-3 rounded-lg border border-border/60 leading-relaxed italic">
            &ldquo;{lead.message || "Customer requested comprehensive Lucknow on-road price breakup and demo drive slot."}&rdquo;
          </p>
        </div>
      </div>

      {/* AI Copilot Briefing Card */}
      <AiSummaryCard summary={lead.ai_summary} customerName={lead.name} />

      {/* Reply Draft Editor (with strict discount blocking) */}
      <ReplyDraftEditor
        leadId={lead.id}
        leadPhone={lead.phone}
        customerName={lead.name}
        initialDraft={
          lead.ai_draft ||
          `Namaste ${lead.name}, thank you for choosing Vrooma. May I schedule your ${lead.model_name || "vehicle"} demo drive in Lucknow?`
        }
        onSent={() => {
          const updated = memoryStore.leads.find((l) => l.id === id);
          if (updated) setLead({ ...updated });
        }}
      />
    </div>
  );
}

