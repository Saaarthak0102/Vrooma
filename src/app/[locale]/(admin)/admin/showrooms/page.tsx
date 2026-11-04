import React from "react";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { listDemoCars } from "@/server/repositories/slots";
import { ShowroomsClient } from "./ShowroomsClient";

export default async function AdminShowroomsPage() {
  const showrooms = await listShowrooms();
  const workshops = await listWorkshops();
  const demoCars = await listDemoCars();

  return <ShowroomsClient showrooms={showrooms} workshops={workshops} demoCars={demoCars} />;
}
