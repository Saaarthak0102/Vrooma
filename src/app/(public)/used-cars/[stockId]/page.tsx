import React from "react";
import { notFound } from "next/navigation";
import { getUsedCarByStockId, listUsedCars } from "@/server/repositories/used-cars";
import { constructMetadata } from "@/lib/seo";
import { VehicleJsonLd, BreadcrumbJsonLd } from "@/components/seo/VehicleJsonLd";
import { UsedCarDetailView } from "./UsedCarDetailView";
import { env } from "@/lib/env";
import { getVehicleAsset } from "@/constants/vehicle-assets";
import { safeStaticParams } from "@/lib/static-params";
import { mockUsedCars } from "@/data/mock/used-cars";

export const dynamicParams = true;

export async function generateStaticParams() {
  return safeStaticParams(async () => {
    const cars = await listUsedCars();
    const ids = new Set([...cars.map((c) => c.stock_id), ...mockUsedCars.map((c) => c.stock_id)]);
    return Array.from(ids).map((stockId) => ({ stockId }));
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stockId: string }>;
}) {
  const { stockId } = await params;
  try {
    const car = await getUsedCarByStockId(stockId);
    if (!car) return {};

    return constructMetadata({
      title: `${car.year} ${car.model_name} ${car.variant_name} (${car.stock_id}) - Certified Used Car`,
      description: `Buy certified used ${car.model_name} in Lucknow with ${car.km.toLocaleString()} km. 140-point inspection report, non-accidental guarantee, and verified registration.`,
      path: `/used-cars/${stockId}`,
      image: car.images[0],
      noIndex: car.status === "sold",
    });
  } catch (error) {
    console.warn(`[UsedCarPage:generateMetadata] Error fetching car ${stockId}:`, error);
    return {};
  }
}

export default async function UsedCarPage({
  params,
}: {
  params: Promise<{ stockId: string }>;
}) {
  const { stockId } = await params;
  let car = null;
  try {
    car = await getUsedCarByStockId(stockId);
  } catch (error) {
    console.warn(`[UsedCarPage] Error loading car ${stockId}:`, error);
  }

  if (!car) {
    notFound();
  }

  return (
    <>
      <VehicleJsonLd
        name={`${car.year} ${car.model_name} ${car.variant_name} (${car.stock_id})`}
        image={getVehicleAsset(car.images?.[0] || car)}
        description={`Certified Used ${car.model_name} with ${car.km.toLocaleString()} km`}
        price={car.price}
        url={`${env.NEXT_PUBLIC_SITE_URL}/used-cars/${car.stock_id}`}
        availability={car.status === "sold" ? "https://schema.org/SoldOut" : car.status === "booked" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Certified Used", item: "/used-cars" },
          { name: `${car.model_name} (${car.stock_id})`, item: `/used-cars/${car.stock_id}` },
        ]}
      />
      <UsedCarDetailView car={car} />
    </>
  );
}

