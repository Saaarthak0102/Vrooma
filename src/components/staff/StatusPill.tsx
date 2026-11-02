import React from "react";
import { LeadStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

export function StatusPill({ status }: { status: LeadStatus }) {
  const configs: Record<
    LeadStatus,
    { label: string; variant: "default" | "secondary" | "accent" | "danger" | "warn" | "ok" }
  > = {
    new: { label: "New Lead", variant: "warn" },
    contacted: { label: "Contacted", variant: "secondary" },
    test_drive_booked: { label: "Demo Booked", variant: "accent" },
    negotiating: { label: "In Negotiation", variant: "default" },
    won: { label: "Vehicle Delivered", variant: "ok" },
    lost: { label: "Archived / Lost", variant: "danger" },
  };

  const config = configs[status] || { label: status, variant: "secondary" };

  return (
    <Badge variant={config.variant} className="text-[11px] font-semibold capitalize">
      {config.label}
    </Badge>
  );
}
