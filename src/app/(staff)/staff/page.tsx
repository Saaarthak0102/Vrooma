import React from "react";
import { listLeads } from "@/server/repositories/leads";
import { listBookings } from "@/server/repositories/bookings";
import { StaffOverviewClient } from "./StaffOverviewClient";

export default async function StaffOverviewPage() {
  const leads = await listLeads({ limit: 50 });
  const bookings = await listBookings();

  return <StaffOverviewClient initialLeads={leads} totalBookings={bookings.length} />;
}
