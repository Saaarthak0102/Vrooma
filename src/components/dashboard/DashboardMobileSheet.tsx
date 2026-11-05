"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Booking, Lead, SavedVehicleRecord } from "@/types/domain";
import { DashboardPanelContent } from "./DashboardPanelContent";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardMobileSheetProps {
  isOpen: boolean;
  activeTab: "bookings" | "saved" | "enquiries";
  onTabChange: (tab: "bookings" | "saved" | "enquiries") => void;
  onClose: () => void;
  bookings: Booking[];
  savedVehicles: SavedVehicleRecord[];
  enquiries: Lead[];
  onRemoveSaved?: (id: string) => void;
}

export function DashboardMobileSheet({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  bookings,
  savedVehicles,
  enquiries,
  onRemoveSaved,
}: DashboardMobileSheetProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-lenis-prevent
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[92svh] h-[92svh] w-full rounded-t-[20px] border-t border-border bg-white p-5 shadow-2xl flex flex-col",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300"
          )}
        >
          {/* Mobile Sheet Drag Handle */}
          <div className="flex items-center justify-center -mt-2 pb-3 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-stone-300" />
          </div>

          {/* Header Row */}
          <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
            <DialogPrimitive.Title className="text-base font-bold text-ink">
              {activeTab === "bookings"
                ? "All Appointments & Test Drives"
                : activeTab === "saved"
                ? "Saved Vehicles"
                : "Vehicle Inquiries"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              View and manage your appointments, saved cars, and inquiries.
            </DialogPrimitive.Description>
            <Button
              variant="ghost"
              size="icon"
              shape="pill"
              onClick={onClose}
              className="h-8 w-8 text-ink-mute hover:text-ink rounded-full"
              aria-label="Close sheet"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pt-3">
            <DashboardPanelContent
              activeTab={activeTab}
              onTabChange={onTabChange}
              bookings={bookings}
              savedVehicles={savedVehicles}
              enquiries={enquiries}
              onRemoveSaved={onRemoveSaved}
              isSheet
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

