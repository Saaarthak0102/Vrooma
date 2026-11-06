import React from "react";
import { listOffers } from "@/server/repositories/offers";
import { OffersClient } from "./OffersClient";

export default async function AdminOffersPage() {
  const offers = await listOffers();
  return <OffersClient initialOffers={offers} />;
}
