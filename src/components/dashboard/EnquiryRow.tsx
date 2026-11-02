import React from "react";
import { Lead } from "@/types/domain";
import { StatusPill } from "@/components/staff/StatusPill";
import { Calendar, User, Phone } from "lucide-react";

export function EnquiryRow({ lead }: { lead: Lead }) {
  const dateFormatted = new Date(lead.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-ink">{lead.model_name || "Enquiry"}</span>
          <StatusPill status={lead.status} />
        </div>
        <p className="text-ink-soft">{lead.message || "Requested showroom quotation and specs"}</p>
        <div className="flex items-center gap-3 text-ink-mute text-[11px] pt-1">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {dateFormatted}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 text-accent-ink" />
            Specialist: {lead.assigned_consultant_name || "Assigned under 5 min"}
          </span>
        </div>
      </div>
    </div>
  );
}
