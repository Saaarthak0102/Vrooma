import React from "react";
import { getBuyerDashboardDataAction } from "@/server/actions/buyer-dashboard";
import { DashboardClientShell } from "@/components/dashboard/DashboardClientShell";
import { listBookings } from "@/server/repositories/bookings";
import { listSavedVehicles } from "@/server/repositories/saved";
import { listLeads } from "@/server/repositories/leads";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardOverviewPage() {
  const result = await getBuyerDashboardDataAction();

  if (result.ok) {
    const { upcomingBookings, pastBookings, savedVehicles, enquiries } = result.data;
    const allBookings = [...upcomingBookings, ...pastBookings];

    const adaptedEnquiries = enquiries.map((e) => ({
      id: e.id,
      ref: e.ref,
      source: "web" as const,
      name: "",
      phone: "",
      showroom_id: "",
      model_name: e.vehicleName,
      status: e.status as any,
      created_at: e.createdAt,
      assigned_consultant_name: "Assigned Specialist",
      sla_due_at: e.createdAt,
    }));

    return (
      <DashboardClientShell
        initialBookings={allBookings}
        initialSavedVehicles={savedVehicles}
        initialEnquiries={adaptedEnquiries as any}
      />
    );
  }

  // Fallback for demo or guest mode
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
