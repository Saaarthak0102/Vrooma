import React from "react";
import { listSlots } from "@/server/repositories/slots";
import { SlotsClient } from "./SlotsClient";

export default async function AdminSlotsPage() {
  const slots = await listSlots({ limit: 50 });
  return <SlotsClient initialSlots={slots} />;
}
