import React from "react";
import { listBookings } from "@/server/repositories/bookings";
import { StaffBookingsClient } from "./StaffBookingsClient";

export default async function StaffBookingsPage() {
  const bookings = await listBookings();
  return <StaffBookingsClient bookings={bookings} />;
}
