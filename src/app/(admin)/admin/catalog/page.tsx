import React from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/viewer";
import { TabLinks, pickTab, type TabLinkItem } from "@/components/layout/TabLinks";
import { listAdminModels } from "@/server/repositories/admin-models";
import { listPriceRules } from "@/server/repositories/pricing";
import { listAllBanners, listAllOffers } from "@/server/repositories/admin-content";
import { ModelsClient } from "@/components/admin/catalog/ModelsClient";
import { ModelDetailClient } from "@/components/admin/catalog/ModelDetailClient";
import { PricesClient } from "@/components/admin/catalog/PricesClient";
import { OffersPanel } from "@/components/admin/catalog/OffersPanel";
import { BannersPanel } from "@/components/admin/catalog/BannersPanel";
import { CatalogOverview } from "@/components/admin/AdminOverviews";
import { loadModelDemand } from "@/server/repositories/admin-overview";

export const dynamic = "force-dynamic";

const TABS: TabLinkItem[] = [
  { id: "models", label: "Models & variants" },
  { id: "prices", label: "On-road price rules" },
  { id: "offers", label: "Offers" },
  { id: "banners", label: "Banners" },
];

/** Screen 2 for the Dealer Principal: everything buyers see about cars, prices and promotions. */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; model?: string | string[] }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const tab = pickTab(params.tab, TABS);

  let body: React.ReactNode;

  if (tab === "models") {
    const models = await listAdminModels();
    const modelId = Array.isArray(params.model) ? params.model[0] : params.model;
    if (modelId) {
      // Detail view of one model, inside the same screen. An unknown id is a 404, never a different model.
      const model = models.find((m) => m.id === modelId || m.slug === modelId);
      if (!model) notFound();
      body = <ModelDetailClient model={model} />;
    } else {
      const demand = await loadModelDemand().catch(() => []);
      body = (
        <div className="space-y-4">
          <CatalogOverview demand={demand} models={models} />
          <ModelsClient initialModels={models} />
        </div>
      );
    }
  } else if (tab === "prices") {
    const [rules, models] = await Promise.all([listPriceRules(), listAdminModels()]);
    body = (
      <PricesClient
        initialRules={rules}
        models={models.map((m) => ({
          id: m.id,
          name: m.name,
          variants: m.variants.filter((v) => v.is_active).map((v) => ({ id: v.id, name: v.name, fuel: v.fuel })),
        }))}
      />
    );
  } else if (tab === "offers") {
    const [offers, models] = await Promise.all([listAllOffers(), listAdminModels()]);
    body = <OffersPanel offers={offers} models={models.map((m) => ({ id: m.id, name: m.name }))} />;
  } else {
    body = <BannersPanel banners={await listAllBanners()} />;
  }

  return (
    <div className="space-y-4">
      <TabLinks base="/admin/catalog" tabs={TABS} active={tab} />
      {body}
    </div>
  );
}
