import React from "react";
import { getBuyerDashboardDataAction } from "@/server/actions/buyer-dashboard";
import { DashboardClientShell } from "@/components/dashboard/DashboardClientShell";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardOverviewPage() {
  const result = await getBuyerDashboardDataAction();

  // Never fall back to unscoped queries: a failure here must not show another buyer's data.
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="We couldn't load your dashboard"
          description="Please refresh the page. If it keeps happening, sign out and back in."
        />
      </div>
    );
  }

  const { upcomingBookings, pastBookings, savedVehicles, chats } = result.data;

  return (
    <DashboardClientShell
      initialBookings={[...upcomingBookings, ...pastBookings]}
      initialSavedVehicles={savedVehicles}
      initialChats={chats}
    />
  );
}
