"use client";

import React, { useState } from "react";
import { memoryStore } from "@/server/store";
import { Slot } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarDays, RefreshCw, Plus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function AdminSlotsPage() {
  const [slots] = useState<Slot[]>(memoryStore.slots.slice(0, 20));

  const columns: Column<Slot>[] = [
    {
      header: "Slot ID",
      cell: (s) => <span className="font-mono text-[11px]">{s.id.slice(0, 24)}...</span>,
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
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Appointment Slot Capacity</h1>
          <p className="text-xs text-ink-soft">
            Automated calendar slot generator with bay conflict resolution.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={notWired("Regenerate Next 30 Days Slots", 3)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Generate 30 Days</span>
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={slots} keyExtractor={(s) => s.id} />
    </div>
  );
}

