import React from "react";
import { notFound } from "next/navigation";
import { getUsedCarByStockId, listUsedCars } from "@/server/repositories/used-cars";
import { UsedCarDetailClient } from "./UsedCarDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUsedCarDetailPage({ params }: PageProps) {
  const { id } = await params;
  let car = await getUsedCarByStockId(id);

  if (!car) {
    const all = await listUsedCars();
    car = all.find((c) => c.id === id || c.stock_id.toLowerCase() === id.toLowerCase()) || all[0];
  }

  if (!car) {
    notFound();
  }

  return <UsedCarDetailClient car={car} />;
}
