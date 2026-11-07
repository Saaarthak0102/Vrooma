"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setBookingOutcomeAction } from "@/server/actions/booking";
import { BookingsOverview, bookingMatches, type BookingFilter } from "@/components/staff/BookingsOverview";
import { ServiceVisitDialog, type ServiceVisitDetails } from "@/components/staff/ServiceVisitDialog";
import { LogCallForm } from "@/components/staff/LogCallForm";
import type { Booking } from "@/types/domain";

export interface BayLoadRow {
  key: string;
  workshop: string;
  /** IST date, YYYY-MM-DD */
  day: string;
  capacity: number;
  booked: number;
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });

export function StaffBookingsClient({
  bookings,
  bayLoad,
  workshops,
}: {
  bookings: Booking[];
  bayLoad: BayLoadRow[];
  workshops: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingFilter>(null);

  const [serviceDialog, setServiceDialog] = useState<Booking | null>(null);

  const markOutcome = async (id: string, outcome: "completed" | "no_show", serviceVisit?: ServiceVisitDetails | null) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await setBookingOutcomeAction(id, outcome, serviceVisit ?? undefined);
      if (res.ok) {
        toast.success(outcome === "completed" ? "Marked as attended." : "Marked as no-show.");
        if (res.data.serviceHistory === "recorded") toast.success("Added to the owner's service history.");
        else if (res.data.serviceHistory === "skipped" && res.data.serviceNote) toast.message(`Service history not saved: ${res.data.serviceNote}`);
        setServiceDialog(null);
        router.refresh();
      } else {
        toast.error(res.error.message || "Could not update the booking.");
      }
    } catch {
      toast.error("Could not update the booking.");
    } finally {
      setBusyId(null);
    }
  };

  const rows = useMemo(
    () => [...bookings].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [bookings]
  );

  const bookingColumns: GridColumn<Booking>[] = [
    {
      id: "kind",
      header: "Type",
      accessor: (b) => (b.kind === "test_drive" ? "Test drive" : "Service"),
      filter: "select",
      cell: (b) => (
        <Badge variant={b.kind === "test_drive" ? "accent" : "secondary"} className="text-[10px]">
          {b.kind === "test_drive" ? "Test drive" : "Service"}
        </Badge>
      ),
    },
    {
      id: "when",
      header: "When (IST)",
      accessor: (b) => b.starts_at,
      cell: (b) => (
        <span>
          <span className="font-semibold">{dayFmt.format(new Date(b.starts_at))}</span>{" "}
          <span className="text-ink-mute">{timeFmt.format(new Date(b.starts_at))}</span>
        </span>
      ),
    },
    {
      id: "vehicle",
      header: "Vehicle",
      accessor: (b) => b.vehicle_info.model_name + (b.vehicle_info.reg_no ? ` ${b.vehicle_info.reg_no}` : ""),
      cell: (b) => (
        <span className="font-bold text-ink">
          {b.vehicle_info.model_name}
          {b.address && <span className="ml-2 text-[10px] font-medium text-ink-soft">Home visit · {b.pincode}</span>}
        </span>
      ),
    },
    { id: "place", header: "Location", accessor: (b) => b.showroom_or_workshop_name, filter: "select" },
    { id: "owner", header: "Specialist", accessor: (b) => b.consultant_name || "-" },
    {
      id: "status",
      header: "Status",
      accessor: (b) => b.status,
      filter: "select",
      cell: (b) => (
        <Badge variant={b.status === "confirmed" ? "ok" : "secondary"} className="text-[10px]">
          {b.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      id: "outcome",
      header: "Outcome",
      sortable: false,
      accessor: () => "",
      cell: (b) =>
        b.status === "confirmed" && new Date(b.starts_at).getTime() <= Date.now() ? (
          <span className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={busyId === b.id}
              onClick={() => (b.kind === "service" ? setServiceDialog(b) : markOutcome(b.id, "completed"))}
            >
              Attended
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-danger"
              disabled={busyId === b.id}
              onClick={() => markOutcome(b.id, "no_show")}
            >
              No-show
            </Button>
          </span>
        ) : (
          <span className="text-ink-mute">{b.status === "confirmed" ? "Upcoming" : "-"}</span>
        ),
    },
  ];

  const bayColumns: GridColumn<BayLoadRow>[] = [
    { id: "workshop", header: "Workshop", accessor: (r) => r.workshop, filter: "select" },
    {
      id: "day",
      header: "Day",
      accessor: (r) => r.day,
      cell: (r) => <span className="font-semibold">{dayFmt.format(new Date(`${r.day}T12:00:00+05:30`))}</span>,
    },
    { id: "booked", header: "Booked", accessor: (r) => r.booked, align: "right" },
    { id: "capacity", header: "Bay capacity", accessor: (r) => r.capacity, align: "right" },
    { id: "free", header: "Free", accessor: (r) => Math.max(0, r.capacity - r.booked), align: "right" },
    {
      id: "load",
      header: "Load",
      accessor: (r) => (r.capacity ? Math.round((r.booked / r.capacity) * 100) : 0),
      cell: (r) => {
        const pct = r.capacity ? Math.round((r.booked / r.capacity) * 100) : 0;
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/10" aria-hidden>
              <span
                className={`block h-full ${pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-success"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </span>
            <span className="tabular-nums">{pct}%</span>
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <ServiceVisitDialog
        open={Boolean(serviceDialog)}
        busy={Boolean(busyId)}
        label={serviceDialog ? `${serviceDialog.vehicle_info.model_name}${serviceDialog.vehicle_info.reg_no ? ` · ${serviceDialog.vehicle_info.reg_no}` : ""}` : ""}
        onCancel={() => setServiceDialog(null)}
        onSubmit={(details) => serviceDialog && markOutcome(serviceDialog.id, "completed", details)}
      />
      <section aria-labelledby="bookings-heading" className="space-y-2">
        <h1 id="bookings-heading" className="text-lg font-black text-ink">
          Test drives &amp; service bookings
        </h1>
        <BookingsOverview bookings={bookings} bayLoad={bayLoad} filter={filter} onFilter={setFilter} />
        <DataGrid
          externalFilter={filter ? (b: Booking) => bookingMatches(b, filter) : null}
          columns={bookingColumns}
          rows={rows}
          rowKey={(b) => b.id}
          searchPlaceholder="Search vehicle, location, specialist…"
          exportName="bookings"
          emptyMessage="No bookings yet."
        />
      </section>

      <section aria-labelledby="calls-heading" className="space-y-2">
        <h2 id="calls-heading" className="text-sm font-black text-ink">
          Log a service call
        </h2>
        <LogCallForm workshops={workshops} />
      </section>

      <section aria-labelledby="bay-heading" className="space-y-2">
        <h2 id="bay-heading" className="text-sm font-black text-ink">
          Workshop bay load · next 7 days
        </h2>
        <DataGrid
          columns={bayColumns}
          rows={bayLoad}
          rowKey={(r) => r.key}
          exportName="bay-load"
          emptyMessage="No service slots in the next 7 days. An admin can generate the calendar in Team & Network."
        />
      </section>
    </div>
  );
}
