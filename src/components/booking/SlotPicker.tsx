"use client";

import React, { useState } from "react";
import { Slot } from "@/types/domain";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface SlotPickerProps {
  slots: Slot[];
  selectedSlotId?: string;
  onSelectSlot: (slot: Slot) => void;
  className?: string;
}

export function SlotPicker({
  slots,
  selectedSlotId,
  onSelectSlot,
  className,
}: SlotPickerProps) {
  // Group slots by Date (YYYY-MM-DD)
  const days = Array.from(
    new Set(slots.map((s) => s.starts_at.slice(0, 10)))
  ).slice(0, 7);

  const [activeDate, setActiveDate] = useState(days[0] || "");

  const daySlots = slots.filter((s) => s.starts_at.startsWith(activeDate));

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
            const d = new Date(dateStr);
            const isSelected = dateStr === activeDate;
            const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
            const dayNum = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

            return (
              <button
                key={dateStr}
                onClick={() => setActiveDate(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[76px] py-2.5 px-3 rounded-lg border transition-all ${
                  isSelected
                    ? "border-dark bg-dark text-white shadow-sm"
                    : "border-border bg-white text-ink hover:border-ink/20"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                  {weekday}
                </span>
                <span className="text-sm font-extrabold mt-0.5">{dayNum}</span>
              </button>
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
                const startTime = new Date(slot.starts_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
                const endTime = new Date(slot.ends_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });

                const isTaken = slot.booked_count >= slot.capacity;
                const isSelected = slot.id === selectedSlotId;
                const remainingBays = slot.capacity - slot.booked_count;

                return isTaken ? (
                  <Tooltip key={slot.id}>
                    <TooltipTrigger asChild>
                      <button
                        disabled
                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-border/80 bg-ink/[0.03] text-ink-mute cursor-not-allowed opacity-60 text-xs"
                      >
                        <Clock className="h-3.5 w-3.5 mb-1 opacity-50" />
                        <span className="font-semibold line-through">{startTime}</span>
                        <span className="text-[10px]">Fully Booked</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This slot is already reserved by another customer</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-xs ${
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
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

