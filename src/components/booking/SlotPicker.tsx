"use client";

import React, { useState } from "react";
import { Slot } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface SlotPickerProps {
  slots: Slot[];
  selectedSlotId?: string;
  onSelectSlot: (slot: Slot) => void;
  className?: string;
}

const IST = "Asia/Kolkata";
/** YYYY-MM-DD of an instant in IST, so day grouping does not depend on the browser timezone. */
const istDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: IST });
const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: true });

export function SlotPicker({
  slots,
  selectedSlotId,
  onSelectSlot,
  className,
}: SlotPickerProps) {
  // Group slots by Date (YYYY-MM-DD)
  const days = Array.from(
    new Set(slots.map((s) => istDate(s.starts_at)))
  ).slice(0, 7);

  const [activeDate, setActiveDate] = useState(days[0] || "");

  const daySlots = slots.filter((s) => istDate(s.starts_at) === activeDate);

  const handleSlotClick = (slot: Slot) => {
    const isTaken = slot.booked_count >= slot.capacity;
    if (isTaken) {
      toast.error("This slot was just taken by another user. Please choose another time.", {
        icon: <AlertCircle className="h-4 w-4 text-danger" />,
      });
      return;
    }
    onSelectSlot(slot);
  };

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Day Strip */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((dateStr) => {
            const d = new Date(`${dateStr}T12:00:00+05:30`);
            const isSelected = dateStr === activeDate;
            const weekday = d.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short" });
            const dayNum = d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });

            return (
              <Button
                key={dateStr}
                variant={isSelected ? "primary" : "outline"}
                shape="soft"
                onClick={() => setActiveDate(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[76px] py-2.5 px-3 h-auto ${
                  isSelected
                    ? "border-dark bg-dark text-white shadow-sm"
                    : "border-border bg-white text-ink hover:border-ink/20"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">
                  {weekday}
                </span>
                <span className="text-sm font-extrabold mt-0.5 block">{dayNum}</span>
              </Button>
            );
          })}
        </div>

        {/* Slot Chips Grid */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2.5 block">
            Select Appointment Window ({activeDate})
          </label>

          {daySlots.length === 0 ? (
            <p className="text-xs text-ink-mute italic py-4">
              No slots available for this date.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {daySlots.map((slot) => {
                const startTime = istTime(slot.starts_at);
                const endTime = istTime(slot.ends_at);

                const isTaken = slot.booked_count >= slot.capacity;
                const isSelected = slot.id === selectedSlotId;
                const remainingBays = slot.capacity - slot.booked_count;

                return isTaken ? (
                  <Tooltip key={slot.id}>
                    <TooltipTrigger asChild>
                      <Button
                        disabled
                        variant="outline"
                        shape="soft"
                        className="flex flex-col items-center justify-center p-3 h-auto border border-dashed border-border/80 bg-ink/[0.03] text-ink-mute cursor-not-allowed opacity-60 text-xs"
                      >
                        <Clock className="h-3.5 w-3.5 mb-1 opacity-50" />
                        <span className="font-semibold line-through">{startTime}</span>
                        <span className="text-[10px]">Fully Booked</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This slot is already reserved by another customer</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    key={slot.id}
                    variant={isSelected ? "secondary" : "outline"}
                    shape="soft"
                    onClick={() => handleSlotClick(slot)}
                    className={`flex flex-col items-center justify-center p-3 h-auto text-xs ${
                      isSelected
                        ? "border-accent bg-accent-soft/40 shadow-sm ring-2 ring-accent text-dark font-bold"
                        : "border-border bg-white text-ink hover:border-ink/20"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 mb-1 text-ink-soft" />
                    <span className="font-bold">{startTime} – {endTime}</span>
                    {slot.capacity > 1 && (
                      <span className="text-[10px] text-accent-ink mt-0.5">
                        {remainingBays} bay{remainingBays > 1 ? "s" : ""} left
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

