import React from "react";
import { listUsedCars } from "@/server/repositories/used-cars";
import { UsedCarsClient } from "./UsedCarsClient";

export default async function AdminUsedCarsPage() {
  const usedCars = await listUsedCars({ limit: 100 });
  return <UsedCarsClient initialUsedCars={usedCars} />;
}
