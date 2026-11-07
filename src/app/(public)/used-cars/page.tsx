import React from "react";
import { UsedCarsCatalog } from "@/components/used/UsedCarsCatalog";
import { listUsedCars } from "@/server/repositories/used-cars";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Certified Used Cars in Lucknow",
  description: "140-point inspected, non-accidental certified pre-owned cars with year, owners and kilometres. Registration numbers are masked.",
  path: "/used-cars",
});

export const revalidate = 300;

export default async function UsedCarsPage() {
  const cars = await listUsedCars().catch((err) => {
    console.warn("[UsedCarsPage] Could not load stock:", err?.message);
    return [];
  });
  return <UsedCarsCatalog cars={cars} />;
}
