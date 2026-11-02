import React from "react";
import { Link } from "@/i18n/navigation";
import { Lead } from "@/types/domain";
import { SlaTimer } from "./SlaTimer";
import { StatusPill } from "./StatusPill";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronRight, Phone, MessageSquare } from "lucide-react";

export interface LeadRowProps {
  lead: Lead;
}

export function LeadRow({ lead }: LeadRowProps) {
  const timeFormatted = new Date(lead.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <TableRow className="hover:bg-ink/[0.02] transition-colors">
      <TableCell className="font-semibold text-ink text-xs">
        <div>
          <span className="font-bold text-sm block">{lead.name}</span>
          <span className="text-[11px] text-ink-mute flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" />
            +91 {lead.phone}
          </span>
        </div>
      </TableCell>

      <TableCell className="text-xs">
        <span className="font-semibold text-ink block">{lead.model_name || "General Line"}</span>
        <span className="text-[11px] text-ink-mute uppercase tracking-wider">
          Source: {lead.source}
        </span>
      </TableCell>

      <TableCell>
        <SlaTimer dueAt={lead.sla_due_at} firstContactedAt={lead.first_contacted_at} />
      </TableCell>

      <TableCell>
        <StatusPill status={lead.status} />
      </TableCell>

      <TableCell className="text-xs text-ink-soft hidden sm:table-cell">
        <span className="font-medium text-ink block">
          {lead.assigned_consultant_name || "Unassigned"}
        </span>
        <span className="text-[10px] text-ink-mute">{timeFormatted}</span>
      </TableCell>

      <TableCell className="text-right">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1">
          <Link href={`/staff/leads/${lead.id}`}>
            <span className="hidden sm:inline">Respond</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
