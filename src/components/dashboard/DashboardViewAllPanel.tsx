"use client";

import React, { useEffect, useRef, useState } from "react";
import { Booking, ChatConversationSummary, SavedVehicleRecord } from "@/types/domain";
import { DashboardPanelContent } from "./DashboardPanelContent";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardViewAllPanelProps {
  isOpen: boolean;
  activeTab: "bookings" | "saved" | "enquiries";
  onTabChange: (tab: "bookings" | "saved" | "enquiries") => void;
  onClose: () => void;
  originElement: HTMLElement | null;
  stageElement: HTMLElement | null;
  overviewElement: HTMLElement | null;
  bookings: Booking[];
  savedVehicles: SavedVehicleRecord[];
  chats: ChatConversationSummary[];
  onRemoveSaved?: (id: string) => void;
  isInitialParam?: boolean;
}

export function DashboardViewAllPanel({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  originElement,
  stageElement,
  overviewElement,
  bookings,
  savedVehicles,
  chats,
  onRemoveSaved,
  isInitialParam = false,
}: DashboardViewAllPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousTriggerRef = useRef<HTMLElement | null>(null);
  const [isRendered, setIsRendered] = useState(isOpen);

  // Keep track of trigger for returning focus
  useEffect(() => {
    if (originElement) {
      previousTriggerRef.current = originElement;
    }
  }, [originElement]);

  // Handle open / close animations via Web Animations API
  useEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    const stage = stageElement;
    const overview = overviewElement;

    if (!panel || !stage) {
      setIsRendered(isOpen);
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isOpen) {
      setIsRendered(true);

      if (isInitialParam) {
        // Direct load via URL param -> open instantly
        panel.style.clipPath = "inset(0 round 16px)";
        panel.style.opacity = "1";
        panel.style.visibility = "visible";
        if (overview) {
          overview.style.opacity = "0";
          overview.style.visibility = "hidden";
          overview.setAttribute("aria-hidden", "true");
          (overview as any).inert = true;
        }
        headingRef.current?.focus();
        return;
      }

      // Compute origin rect relative to stage
      const originNode =
        originElement?.closest?.("[data-bento-origin]") ||
        originElement ||
        previousTriggerRef.current;

      const originRect = originNode?.getBoundingClientRect?.() || stage.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const top = Math.max(0, originRect.top - stageRect.top);
      const right = Math.max(0, stageRect.right - originRect.right);
      const bottom = Math.max(0, stageRect.bottom - originRect.bottom);
      const left = Math.max(0, originRect.left - stageRect.left);

      panel.style.visibility = "visible";

      if (prefersReducedMotion) {
        // Instant crossfade
        const anim = panel.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 120,
          fill: "forwards",
        });
        anim.onfinish = () => {
          if (overview) {
            overview.style.opacity = "0";
            overview.style.visibility = "hidden";
            overview.setAttribute("aria-hidden", "true");
            (overview as any).inert = true;
          }
          headingRef.current?.focus();
        };
      } else {
        // WAAPI clip-path expansion
        const panelAnim = panel.animate(
          [
            { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 16px)`, opacity: 0.8 },
            { clipPath: "inset(0px 0px 0px 0px round 16px)", opacity: 1 },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          }
        );

        if (content) {
          content.animate(
            [
              { opacity: 0, transform: "translateY(6px)" },
              { opacity: 1, transform: "translateY(0px)" },
            ],
            {
              duration: 160,
              delay: 100,
              easing: "ease-out",
              fill: "forwards",
            }
          );
        }

        if (overview) {
          overview.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 250,
            fill: "forwards",
          });
        }

        panelAnim.onfinish = () => {
          if (overview) {
            overview.style.visibility = "hidden";
            overview.setAttribute("aria-hidden", "true");
            (overview as any).inert = true;
          }
          headingRef.current?.focus();
        };
      }
    } else if (isRendered) {
      // Closing
      if (overview) {
        overview.style.visibility = "visible";
        overview.removeAttribute("aria-hidden");
        (overview as any).inert = false;
      }

      const originNode =
        originElement?.closest?.("[data-bento-origin]") ||
        originElement ||
        previousTriggerRef.current;

      const originRect = originNode?.getBoundingClientRect?.() || stage.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const top = Math.max(0, originRect.top - stageRect.top);
      const right = Math.max(0, stageRect.right - originRect.right);
      const bottom = Math.max(0, stageRect.bottom - originRect.bottom);
      const left = Math.max(0, originRect.left - stageRect.left);

      if (prefersReducedMotion) {
        const anim = panel.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 120,
          fill: "forwards",
        });
        anim.onfinish = () => {
          panel.style.visibility = "hidden";
          setIsRendered(false);
          previousTriggerRef.current?.focus?.();
        };
      } else {
        const closeAnim = panel.animate(
          [
            { clipPath: "inset(0px 0px 0px 0px round 16px)", opacity: 1 },
            { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 16px)`, opacity: 0 },
          ],
          {
            duration: 300,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          }
        );

        if (overview) {
          overview.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 300,
            fill: "forwards",
          });
        }

        closeAnim.onfinish = () => {
          panel.style.visibility = "hidden";
          setIsRendered(false);
          previousTriggerRef.current?.focus?.();
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isInitialParam]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isRendered && !isOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      id="dashboard-view-all-panel"
      role="region"
      aria-labelledby="dashboard-panel-heading"
      data-lenis-prevent
      className={cn(
        "dashboard-stage-panel absolute inset-0 z-30 rounded-[16px] border border-border bg-white shadow-xl flex flex-col overflow-hidden",
        !isOpen && !isRendered && "hidden"
      )}
    >
      {/* Panel Top Header Bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border shrink-0 bg-white">
        <h2
          ref={headingRef}
          id="dashboard-panel-heading"
          tabIndex={-1}
          className="text-base font-bold text-ink outline-none"
        >
          {activeTab === "bookings"
            ? "All Appointments & Test Drives"
            : activeTab === "saved"
            ? "Saved Vehicles Wishlist"
            : "Support Chats"}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          shape="pill"
          onClick={onClose}
          className="h-8 w-8 text-ink-mute hover:text-ink rounded-full"
          aria-label="Close panel (Escape)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Panel Body Content */}
      <div ref={contentRef} className="flex-1 p-5 overflow-hidden flex flex-col">
        <DashboardPanelContent
          activeTab={activeTab}
          onTabChange={onTabChange}
          bookings={bookings}
          savedVehicles={savedVehicles}
          chats={chats}
          onRemoveSaved={onRemoveSaved}
        />
      </div>
    </div>
  );
}
