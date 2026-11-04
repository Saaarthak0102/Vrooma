"use client";

import React, { useState } from "react";
import { Slot } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

interface SlotsClientProps {
  initialSlots: Slot[];
}

export function SlotsClient({ initialSlots }: SlotsClientProps) {
  const [slots] = useState<Slot[]>(initialSlots);

  const columns: Column<Slot>[] = [
    {
      header: "Slot ID",
      cell: (s) => <span className="font-mono text-[11px]">{s.id.slice(0, 18)}...</span>,
    },
    {
      header: "Kind",
      cell: (s) => (
        <Badge variant={s.kind === "test_drive" ? "accent" : "secondary"} className="text-[10px] capitalize">
          {s.kind}
        </Badge>
      ),
    },
    {
      header: "Window Time",
      cell: (s) => {
        const start = new Date(s.starts_at).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return <span className="text-xs font-semibold">{start}</span>;
      },
    },
    {
      header: "Capacity",
      cell: (s) => <span>{s.capacity} max</span>,
    },
    {
      header: "Booked",
      cell: (s) => (
        <span className={`text-xs font-bold ${s.booked_count >= s.capacity ? "text-danger" : "text-accent-ink"}`}>
          {s.booked_count} reserved
        </span>
      ),
    },
    {
      header: "Facility ID",
      cell: (s) => (
        <span className="font-mono text-[10px] text-ink-mute">
          {s.showroom_id || s.workshop_id || "Unassigned"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Appointment Slots Engine</h1>
          <p className="text-xs text-ink-soft">
            Manages time slot allocations for showroom test drives and workshop maintenance bays.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={notWired("Regenerate Next 30 Days Slots", 3)}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Regenerate 30-Day Calendar</span>
        </Button>
      </div>

      <DataTable columns={columns} data={slots} keyExtractor={(s) => s.id} />
    </div>
  );
}

