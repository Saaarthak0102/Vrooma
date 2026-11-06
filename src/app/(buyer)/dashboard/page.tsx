import React from "react";
import { getBuyerDashboardDataAction } from "@/server/actions/buyer-dashboard";
import { DashboardClientShell } from "@/components/dashboard/DashboardClientShell";
import { listBookings } from "@/server/repositories/bookings";
import { listSavedVehicles } from "@/server/repositories/saved";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardOverviewPage() {
  const result = await getBuyerDashboardDataAction();

  if (result.ok) {
    const { upcomingBookings, pastBookings, savedVehicles, chats } = result.data;
    const allBookings = [...upcomingBookings, ...pastBookings];

    return (
      <DashboardClientShell
        initialBookings={allBookings}
        initialSavedVehicles={savedVehicles}
        initialChats={chats}
      />
    );
  }

  // Fallback for demo or guest mode
  const [bookings, savedVehicles] = await Promise.all([listBookings(), listSavedVehicles()]);

  return (
    <DashboardClientShell
      initialBookings={bookings}
      initialSavedVehicles={savedVehicles}
      initialChats={[]}
    />
  );
}
