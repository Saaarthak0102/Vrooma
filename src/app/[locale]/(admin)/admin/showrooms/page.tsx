"use client";

import React from "react";
import { memoryStore } from "@/server/store";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Showroom, Workshop, DemoCar } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wrench, Car, Plus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function AdminShowroomsPage() {
  const showrooms = memoryStore.showrooms;
  const workshops = memoryStore.workshops;
  const demoCars = memoryStore.demoCars;

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
      cell: (s) => <span className="capitalize text-xs font-semibold">{s.city_id.replace("city-", "")}</span>,
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
          {w.bays} Automated Bays
        </Badge>
      ),
    },
    {
      header: "Direct Phone",
      cell: (w) => <span className="text-xs font-mono">{w.phone}</span>,
    },
  ];

  const demoCarCols: Column<DemoCar>[] = [
    {
      header: "Fleet Reg Label",
      cell: (d) => <span className="font-mono font-bold text-xs">{d.reg_label}</span>,
    },
    {
      header: "Variant",
      cell: (d) => <span className="font-semibold text-xs text-ink">{d.variant_name}</span>,
    },
    {
      header: "Assigned Showroom",
      cell: (d) => <span className="text-xs text-ink-soft">{d.showroom_id}</span>,
    },
    {
      header: "Status",
      cell: (d) => (
        <Badge variant={d.active ? "ok" : "outline"} className="text-[10px]">
          {d.active ? "Active Demo" : "Maintenance"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Facilities, Service Bays & Demo Fleet</h1>
          <p className="text-xs text-ink-soft">
            Manage physical retail locations, mechanical bay intake capacity, and registered demo test cars.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent-ink" />
            <span>Retail Showrooms ({showrooms.length})</span>
          </h3>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={notWired("Add Showroom", 3)}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Showroom</span>
          </Button>
        </div>
        <DataTable columns={showroomCols} data={showrooms} keyExtractor={(s) => s.id} />
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <Wrench className="h-4 w-4 text-accent-ink" />
            <span>Service Workshops & Bay Capacity ({workshops.length})</span>
          </h3>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={notWired("Add Workshop", 3)}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Workshop</span>
          </Button>
        </div>
        <DataTable columns={workshopCols} data={workshops} keyExtractor={(w) => w.id} />
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <Car className="h-4 w-4 text-accent-ink" />
            <span>Active Showroom Demo Fleet ({demoCars.length})</span>
          </h3>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={notWired("Add Demo Car", 3)}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Demo Car</span>
          </Button>
        </div>
        <DataTable columns={demoCarCols} data={demoCars} keyExtractor={(d) => d.id} />
      </div>
    </div>
  );
}
