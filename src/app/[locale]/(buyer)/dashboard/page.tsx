import React from "react";
import { listBookings } from "@/server/repositories/bookings";
import { listSavedVehicles } from "@/server/repositories/saved";
import { listLeads } from "@/server/repositories/leads";
import { DashboardClientShell } from "@/components/dashboard/DashboardClientShell";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const [bookings, savedVehicles, enquiries] = await Promise.all([
    listBookings(),
    listSavedVehicles(),
    listLeads(),
  ]);

  return (
    <DashboardClientShell
      initialBookings={bookings}
      initialSavedVehicles={savedVehicles}
      initialEnquiries={enquiries}
    />
  );
}
