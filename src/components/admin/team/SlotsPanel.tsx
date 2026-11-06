"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Button } from "@/components/ui/button";
import { generateSlotsAction } from "@/server/actions/booking";

export interface SlotGridRow {
  id: string;
  kind: "test_drive" | "service";
  where: string;
  starts_at: string;
  capacity: number;
  booked: number;
}

const whenFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function SlotsPanel({ slots }: { slots: SlotGridRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await generateSlotsAction(undefined, 30);
      if (res.ok) {
        toast.success("Calendar checked and filled for the next 30 days.");
        router.refresh();
      } else {
        toast.error(res.error?.message ?? "Could not generate slots.");
      }
    } finally {
      setBusy(false);
    }
  };

  const columns: GridColumn<SlotGridRow>[] = [
    {
      id: "kind",
      header: "Type",
      accessor: (s) => (s.kind === "test_drive" ? "Test drive" : "Service"),
      filter: "select",
    },
    { id: "where", header: "Showroom / workshop", accessor: (s) => s.where, filter: "select" },
    {
      id: "when",
      header: "When (IST)",
      accessor: (s) => s.starts_at,
      cell: (s) => whenFmt.format(new Date(s.starts_at)),
    },
    { id: "booked", header: "Booked", accessor: (s) => s.booked, align: "right" },
    { id: "capacity", header: "Capacity", accessor: (s) => s.capacity, align: "right" },
    {
      id: "free",
      header: "Free",
      accessor: (s) => Math.max(0, s.capacity - s.booked),
      align: "right",
      cell: (s) => (
        <span className={s.capacity - s.booked <= 0 ? "font-bold text-danger" : ""}>{Math.max(0, s.capacity - s.booked)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">
        Bookable slots come from this calendar: test drives hourly 10:00-18:00 per demo car, service hourly 09:00-17:00
        with capacity equal to the workshop&apos;s bays. Generating only adds slots that do not exist yet.
      </p>
      <DataGrid
        columns={columns}
        rows={slots}
        rowKey={(s) => s.id}
        exportName="slots"
        emptyMessage="No upcoming slots. Generate the calendar to open bookings."
        toolbar={
          <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" disabled={busy} onClick={generate}>
            <CalendarPlus className="h-3.5 w-3.5" />
            {busy ? "Generating…" : "Generate next 30 days"}
          </Button>
        }
      />
    </div>
  );
}
