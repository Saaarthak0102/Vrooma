import React from "react";
import { notFound } from "next/navigation";
import { getUsedCarByStockId, listUsedCars } from "@/server/repositories/used-cars";
import { UsedCarDetailClient } from "./UsedCarDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUsedCarDetailPage({ params }: PageProps) {
  const { id } = await params;
  let car = await getUsedCarByStockId(id);

  if (!car) {
    const all = await listUsedCars();
    // Match by id or stock id only. An unknown id must 404; never fall back to another car,
    // because this page can change a car's price and status.
    car = all.find((c) => c.id === id || c.stock_id.toLowerCase() === id.toLowerCase()) ?? null;
  }

  if (!car) {
    notFound();
  }

  return <UsedCarDetailClient car={car} />;
}
