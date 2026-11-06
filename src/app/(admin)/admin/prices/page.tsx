import React from "react";
import { listPriceRules } from "@/server/repositories/pricing";
import { PricesClient } from "./PricesClient";

export default async function AdminPricesPage() {
  const rules = await listPriceRules();
  return <PricesClient initialRules={rules} />;
}
