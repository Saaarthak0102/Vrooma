import React from "react";
import { CarsCatalog } from "@/components/cars/CarsCatalog";
import { listModels } from "@/server/repositories/models";
import { listActiveOfferModelIds } from "@/server/repositories/offers";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "New Cars - Brand X Lineup in Lucknow & Kanpur",
  description: "Explore every Brand X model with real prices, variants, colours and the full on-road price breakup by city.",
  path: "/cars",
});

export const revalidate = 300;

export default async function CarsPage() {
  const [models, activeOfferModelIds] = await Promise.all([
    listModels().catch((err) => {
      console.warn("[CarsPage] Could not load models:", err?.message);
      return [];
    }),
    listActiveOfferModelIds().catch(() => []),
  ]);
  return <CarsCatalog models={models} activeOfferModelIds={activeOfferModelIds} />;
}
