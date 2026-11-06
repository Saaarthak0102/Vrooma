"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Badge } from "@/components/ui/badge";
import { updateWorkshopBaysAction } from "@/server/actions/admin-network";
import type { DemoCar, Showroom, Workshop } from "@/types/domain";

/** Bays are the capacity behind service booking, so they are editable right in the table. */
function BaysCell({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  const [value, setValue] = useState(String(workshop.bays));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const next = Number(value);
    if (next === workshop.bays) return;
    setSaving(true);
    const res = await updateWorkshopBaysAction(workshop.id, next);
    setSaving(false);
    if (res.ok) {
      toast.success(`${workshop.name} now has ${next} bays. ${res.data.slotsUpdated} upcoming slots resized.`);
      router.refresh();
    } else {
      setValue(String(workshop.bays));
      toast.error(res.error?.message ?? "Could not update the bays.");
    }
  };

  return (
    <input
      type="number"
      min={1}
      max={50}
      step={1}
      value={value}
      disabled={saving}
      aria-label={`Bays at ${workshop.name}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className="h-8 w-16 rounded-md border border-border bg-bg px-2 text-right text-xs font-bold tabular-nums"
    />
  );
}

export function NetworkPanel({
  showrooms,
  workshops,
  demoCars,
}: {
  showrooms: Showroom[];
  workshops: Workshop[];
  demoCars: DemoCar[];
}) {
  const showroomName = (id: string) => showrooms.find((s) => s.id === id)?.name ?? "-";

  const showroomColumns: GridColumn<Showroom>[] = [
    { id: "name", header: "Showroom", accessor: (s) => s.name, cell: (s) => <span className="font-bold text-ink">{s.name}</span> },
    { id: "address", header: "Address", accessor: (s) => s.address },
    { id: "phone", header: "Phone", accessor: (s) => s.phone },
  ];
  const workshopColumns: GridColumn<Workshop>[] = [
    { id: "name", header: "Workshop", accessor: (w) => w.name, cell: (w) => <span className="font-bold text-ink">{w.name}</span> },
    { id: "address", header: "Address", accessor: (w) => w.address },
    { id: "phone", header: "Phone", accessor: (w) => w.phone },
    { id: "bays", header: "Service bays", accessor: (w) => w.bays, align: "right", cell: (w) => <BaysCell workshop={w} /> },
  ];
  const demoColumns: GridColumn<DemoCar>[] = [
    { id: "car", header: "Demo car", accessor: (d) => d.variant_name, cell: (d) => <span className="font-bold text-ink">{d.variant_name}</span> },
    { id: "reg", header: "Plate label", accessor: (d) => d.reg_label },
    { id: "showroom", header: "Showroom", accessor: (d) => showroomName(d.showroom_id), filter: "select" },
    {
      id: "active",
      header: "Status",
      accessor: (d) => (d.active ? "In service" : "Off the road"),
      filter: "select",
      cell: (d) => (
        <Badge variant={d.active ? "ok" : "outline"} className="text-[10px]">
          {d.active ? "In service" : "Off the road"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-2" aria-labelledby="showrooms-h">
        <h2 id="showrooms-h" className="text-sm font-black text-ink">Showrooms</h2>
        <DataGrid columns={showroomColumns} rows={showrooms} rowKey={(s) => s.id} exportName="showrooms" />
      </section>
      <section className="space-y-2" aria-labelledby="workshops-h">
        <h2 id="workshops-h" className="text-sm font-black text-ink">Workshops and bay capacity</h2>
        <DataGrid columns={workshopColumns} rows={workshops} rowKey={(w) => w.id} exportName="workshops" />
      </section>
      <section className="space-y-2" aria-labelledby="demo-h">
        <h2 id="demo-h" className="text-sm font-black text-ink">Demo cars</h2>
        <DataGrid columns={demoColumns} rows={demoCars} rowKey={(d) => d.id} exportName="demo-cars" />
      </section>
    </div>
  );
}
