"use client";

import React from "react";
import { memoryStore } from "@/server/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Car } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function StaffBookingsPage() {
  const bookings = memoryStore.bookings;

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
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              const timeFormatted = new Date(b.starts_at).toLocaleTimeString("en-IN", {
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8"
                      onClick={notWired("Mark Booking Attended", 4)}
                    >
                      Update
                    </Button>
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

