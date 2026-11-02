import React from "react";
import { Lead } from "@/types/domain";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadRow } from "./LeadRow";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";

export interface LeadTableProps {
  leads: Lead[];
}

export function LeadTable({ leads }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-10 w-10 text-ink-mute" />}
        title="No leads in this queue"
        description="All inbound web and portal leads have been acknowledged within SLA."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Customer</TableHead>
            <TableHead className="text-xs">Vehicle / Source</TableHead>
            <TableHead className="text-xs">SLA Countdown</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs hidden sm:table-cell">Assigned Specialist</TableHead>
            <TableHead className="text-xs text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
