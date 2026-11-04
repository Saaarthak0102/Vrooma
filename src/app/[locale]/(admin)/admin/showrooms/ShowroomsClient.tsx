"use client";

import React from "react";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Showroom, Workshop, DemoCar } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wrench, Car, Plus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

interface ShowroomsClientProps {
  showrooms: Showroom[];
  workshops: Workshop[];
  demoCars: DemoCar[];
}

export function ShowroomsClient({ showrooms, workshops, demoCars }: ShowroomsClientProps) {
  const showroomCols: Column<Showroom>[] = [
    {
      header: "Showroom Name",
      cell: (s) => (
        <div>
          <span className="font-bold text-xs text-ink block">{s.name}</span>
          <span className="text-[11px] text-ink-mute">{s.address}</span>
        </div>
      ),
    },
    {
      header: "City",
      cell: (s) => (
        <span className="capitalize text-xs font-semibold">
          {s.city_id.includes("c0000001-0000-0000-0000-000000000002") ? "Kanpur" : "Lucknow"}
        </span>
      ),
    },
    {
      header: "Phone Desk",
      cell: (s) => <span className="text-xs font-mono">{s.phone}</span>,
    },
  ];

  const workshopCols: Column<Workshop>[] = [
    {
      header: "Workshop Facility",
      cell: (w) => (
        <div>
          <span className="font-bold text-xs text-ink block">{w.name}</span>
          <span className="text-[11px] text-ink-mute">{w.address}</span>
        </div>
      ),
    },
    {
      header: "Active Bays",
      cell: (w) => (
        <Badge variant="accent" className="font-bold text-xs">
          {w.bays} Bays
        </Badge>
      ),
    },
    {
      header: "Phone",
      cell: (w) => <span className="text-xs font-mono">{w.phone}</span>,
    },
  ];

  const demoCols: Column<DemoCar>[] = [
    {
      header: "Demo Vehicle",
      cell: (d) => <span className="font-bold text-xs text-ink">{d.variant_name}</span>,
    },
    {
      header: "Registration Plate",
      cell: (d) => (
        <Badge variant="secondary" className="font-mono text-[11px]">
          {d.reg_label}
        </Badge>
      ),
    },
    {
      header: "Assigned Showroom",
      cell: (d) => {
        const sr = showrooms.find((s) => s.id === d.showroom_id);
        return <span className="text-xs font-medium">{sr?.name || "Hazratganj Flagship"}</span>;
      },
    },
    {
      header: "Status",
      cell: (d) => (
        <Badge variant={d.active ? "ok" : "outline"} className="text-[10px]">
          {d.active ? "Ready" : "Maintenance"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-10 max-w-6xl">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-black text-ink">Showroom & Workshop Facilities</h1>
        <p className="text-xs text-ink-soft">
          Physical dealership footprint across Hazratganj, Gomti Nagar, Kanpur Road, and Shaheed Path.
        </p>
      </div>

      {/* Showrooms Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent-ink" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              New Car Showrooms ({showrooms.length})
            </h3>
          </div>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={notWired("Add Showroom", 3)}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Showroom</span>
          </Button>
        </div>
        <DataTable columns={showroomCols} data={showrooms} keyExtractor={(s) => s.id} />
      </div>

      {/* Workshops Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-accent-ink" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Authorised Service Workshops ({workshops.length})
            </h3>
          </div>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={notWired("Add Workshop", 3)}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Workshop</span>
          </Button>
        </div>
        <DataTable columns={workshopCols} data={workshops} keyExtractor={(w) => w.id} />
      </div>

      {/* Demo Cars Fleet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-accent-ink" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Test-Drive Demo Fleet ({demoCars.length})
            </h3>
          </div>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={notWired("Add Demo Car", 3)}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Demo Car</span>
          </Button>
        </div>
        <DataTable columns={demoCols} data={demoCars} keyExtractor={(d) => d.id} />
      </div>
    </div>
  );
}

