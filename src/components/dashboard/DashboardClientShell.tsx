"use client";

import React, { useRef, useState, useEffect } from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Booking, ChatConversationSummary, SavedVehicleRecord } from "@/types/domain";
import { DashboardGreeting } from "./DashboardGreeting";
import { DashboardCountStrip } from "./DashboardCountStrip";
import { NextAppointmentCard } from "./NextAppointmentCard";
import { SavedVehiclesCard } from "./SavedVehiclesCard";
import { DashboardActionTile } from "./DashboardActionTile";
import { RecentChatsPanel } from "./RecentChatsPanel";
import { DashboardViewAllPanel } from "./DashboardViewAllPanel";
import { MyCarsSection } from "./MyCarsSection";
import { DashboardMobileSheet } from "./DashboardMobileSheet";
import { useTranslations } from "next-intl";
import { Car, Wrench } from "lucide-react";
import { Container } from "@/components/ui/container";
import { removeSavedVehicleAction } from "@/server/actions/buyer-dashboard";
import { toast } from "sonner";

const validViews = ["bookings", "saved", "enquiries"] as const;
export type DashboardView = (typeof validViews)[number];

export interface DashboardClientShellProps {
  initialBookings: Booking[];
  initialSavedVehicles: SavedVehicleRecord[];
  initialChats: ChatConversationSummary[];
}

export function DashboardClientShell({
  initialBookings,
  initialSavedVehicles,
  initialChats,
}: DashboardClientShellProps) {
  const t = useTranslations("dashboard");

  // Local state for live mutations
  // Bookings come straight from the server props so router.refresh() after a cancel updates every view.
  const bookings = initialBookings;
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicleRecord[]>(initialSavedVehicles);
  const chats = initialChats;

  // URL state with nuqs
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum<DashboardView>([...validViews]).withOptions({
      shallow: true,
      history: "push",
    })
  );

  // Track if view was loaded directly on page mount
  const isInitialParamRef = useRef<boolean>(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("view") && validViews.includes(params.get("view") as any)) {
        isInitialParamRef.current = true;
      }
    }
  }, []);

  // Desktop media query check: >= 1100px wide AND >= 620px tall
  const isDesktop = useMediaQuery("(min-width: 1100px) and (min-height: 620px)");

  // Stage and overview DOM refs for Web Animations API
  const stageRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const [originEl, setOriginEl] = useState<HTMLElement | null>(null);

  // Handler when clicking a panel trigger (count strip cell or "View all" link)
  const handleOpenView = (targetView: DashboardView, triggerElement: HTMLElement) => {
    isInitialParamRef.current = false;
    setOriginEl(triggerElement);

    if (view === targetView) {
      // Toggle close if already open
      setView(null);
    } else {
      setView(targetView);
    }
  };

  const handleClose = () => {
    isInitialParamRef.current = false;
    setView(null);
  };

  const handleTabChange = (nextTab: DashboardView) => {
    isInitialParamRef.current = false;
    setView(nextTab);
  };

  const handleRemoveSaved = async (id: string) => {
    const previous = [...savedVehicles];
    setSavedVehicles((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await removeSavedVehicleAction(id);
      if (!res.ok) {
        setSavedVehicles(previous);
        toast.error(res.error?.message || "Failed to remove saved vehicle.");
      } else {
        toast.success("Vehicle removed from saved list");
      }
    } catch {
      setSavedVehicles(previous);
      toast.error("Failed to remove saved vehicle.");
    }
  };

  // Find next upcoming appointment
  const now = new Date().getTime();
  const sortedUpcoming = [...bookings]
    .filter((b) => b.status !== "cancelled" && new Date(b.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const nextBooking = sortedUpcoming[0] || null;

  const isViewValid = (val: string | null): val is DashboardView =>
    val !== null && (validViews as readonly string[]).includes(val);

  const isOpen = isViewValid(view);
  const activeTab: DashboardView = isViewValid(view) ? view : "bookings";

  return (
    <div
      data-dashboard-desktop-shell="true"
      className="dashboard-desktop-shell min-h-full w-full"
    >
      <Container className="h-full flex flex-col justify-between">
        {/* Top Greeting: always visible outside the stage */}
        <DashboardGreeting />

        {/* Stage Container: covers Count Strip + Bento Grid on Desktop */}
        <div ref={stageRef} className="dashboard-stage-container relative">
          {/* Overview layer that fades out when in-place panel opens */}
          <div ref={overviewRef} className="dashboard-overview-stage">
            {/* 4.2 Count Strip */}
            <DashboardCountStrip
              bookingsCount={sortedUpcoming.length}
              savedCount={savedVehicles.length}
              chatsCount={chats.length}
              activeView={isOpen ? view : null}
              onSelectView={handleOpenView}
            />

            {/* Bento Grid */}
            <div className="dashboard-bento-grid mt-2">
              {/* 4.3 Upcoming Appointments (Cols 1-5, Rows 1-4 on Desktop) */}
              <NextAppointmentCard
                bookings={bookings}
                upcomingBookings={sortedUpcoming.slice(0, 2)}
                totalBookingsCount={sortedUpcoming.length}
                onViewAll={(el) => handleOpenView("bookings", el)}
                style={{ "--i": 1 } as React.CSSProperties}
              />

              {/* 4.5 Mobile/Tablet Tiles Wrapper (order 2 on small screens) */}
              <div className="bento-tiles-wrapper min-[1100px]:contents">
                {/* Tile 1: Book a test drive (DARK tile, primary action) */}
                <DashboardActionTile
                  variant="dark"
                  href="/book/test-drive"
                  icon={Car}
                  title={t("bookTestDrive")}
                  subtitle={t("bookTestDriveSub")}
                  className="bento-tile-test-drive"
                  style={{ "--i": 3 } as React.CSSProperties}
                />

                {/* Tile 2: Book a service (Light tile) */}
                <DashboardActionTile
                  variant="light"
                  href="/book/service"
                  icon={Wrench}
                  title={t("bookService")}
                  subtitle={t("bookServiceSub")}
                  className="bento-tile-service"
                  style={{ "--i": 4 } as React.CSSProperties}
                />
              </div>

              {/* Tablet 768px-1023px Side-by-Side Wrapper */}
              <div className="tablet-side-by-side min-[1100px]:contents max-[767px]:contents">
                {/* 4.4 Saved Vehicles (Cols 6-9, Rows 1-2 on Desktop) */}
                <SavedVehiclesCard
                  records={savedVehicles}
                  onViewAll={(el) => handleOpenView("saved", el)}
                  className="bento-saved"
                  style={{ "--i": 2 } as React.CSSProperties}
                />

                {/* 4.6 Recent Enquiries (Cols 6-12, Rows 3-4 on Desktop) */}
                <RecentChatsPanel
                  chats={chats}
                  onViewAll={(el) => handleOpenView("enquiries", el)}
                  className="bento-enquiries"
                  style={{ "--i": 5 } as React.CSSProperties}
                />
              </div>
            </div>

            <MyCarsSection />
          </div>

          {/* Desktop In-Place Expanding Panel (Active when isDesktop) */}
          {isDesktop && (
            <DashboardViewAllPanel
              isOpen={isOpen}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onClose={handleClose}
              originElement={originEl}
              stageElement={stageRef.current}
              overviewElement={overviewRef.current}
              bookings={bookings}
              savedVehicles={savedVehicles}
              chats={chats}
              onRemoveSaved={handleRemoveSaved}
              isInitialParam={isInitialParamRef.current}
            />
          )}
        </div>

        {/* Mobile/Tablet Full-Height Bottom Sheet (Active when not desktop) */}
        {!isDesktop && (
          <DashboardMobileSheet
            isOpen={isOpen}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onClose={handleClose}
            bookings={bookings}
            savedVehicles={savedVehicles}
            chats={chats}
            onRemoveSaved={handleRemoveSaved}
          />
        )}
      </Container>
    </div>
  );
}
