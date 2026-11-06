"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setBookingOutcomeAction } from "@/server/actions/booking";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Booking } from "@/types/domain";

interface StaffBookingsClientProps {
  bookings: Booking[];
}

export function StaffBookingsClient({ bookings }: StaffBookingsClientProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const markOutcome = async (id: string, outcome: "completed" | "no_show") => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await setBookingOutcomeAction(id, outcome);
      if (res.ok) {
        toast.success(outcome === "completed" ? "Marked as attended." : "Marked as no-show.");
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

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-black text-ink">Scheduled Demos & Services</h1>
        <p className="text-xs text-ink-soft">
          Live calendar of customer test drives and workshop bay reservations across Hazratganj, Gomti Nagar & Transport Nagar.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Vehicle / Model</TableHead>
              <TableHead className="text-xs">Schedule Time</TableHead>
              <TableHead className="text-xs">Facility Location</TableHead>
              <TableHead className="text-xs">Relationship Specialist</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => {
              const dateFormatted = new Date(b.starts_at).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              const timeFormatted = new Date(b.starts_at).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <Badge
                      variant={b.kind === "test_drive" ? "accent" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {b.kind === "test_drive" ? "Test Drive" : "Workshop"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-ink">
                    {b.vehicle_info.model_name}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-semibold block">{dateFormatted}</span>
                    <span className="text-[10px] text-ink-mute">{timeFormatted}</span>
                  </TableCell>
                  <TableCell className="text-xs text-ink-soft">
                    {b.showroom_or_workshop_name}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-ink">
                    {b.consultant_name || "Assigned Specialist"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "confirmed" ? "ok" : "secondary"} className="text-[10px]">
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status === "confirmed" && new Date(b.starts_at).getTime() <= Date.now() ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8"
                          disabled={busyId === b.id}
                          onClick={() => markOutcome(b.id, "completed")}
                        >
                          Attended
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-danger"
                          disabled={busyId === b.id}
                          onClick={() => markOutcome(b.id, "no_show")}
                        >
                          No-show
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-mute">{b.status === "confirmed" ? "Upcoming" : "-"}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

