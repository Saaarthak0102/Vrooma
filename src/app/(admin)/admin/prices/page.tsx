import React from "react";
import { listPriceRules } from "@/server/repositories/pricing";
import { listModels } from "@/server/repositories/models";
import { PricesClient } from "./PricesClient";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  const [rules, models] = await Promise.all([listPriceRules(), listModels({ limit: 100 })]);

  // Only what the rule form and the readable table need; never ship whole model payloads to the client.
  const modelOptions = models.map((m) => ({
    id: m.id,
    name: m.name,
    variants: (m.variants ?? []).map((v) => ({ id: v.id, name: v.name, fuel: v.fuel })),
  }));

  return <PricesClient initialRules={rules} models={modelOptions} />;
}
