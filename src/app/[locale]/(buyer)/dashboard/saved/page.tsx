"use client";

import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { SavedCarCard } from "@/components/dashboard/SavedCarCard";
import { memoryStore } from "@/server/store";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Bookmark } from "lucide-react";

export default function DashboardSavedPage() {
  const model = memoryStore.models[0];
  const used = memoryStore.usedCars[0];

  return (
    <PageShell
      title="Saved Vehicles"
      subtitle="Quick access to new models and certified pre-owned vehicles you have bookmarked."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Saved Vehicles" }]}
    >
      <div className="space-y-4 max-w-2xl">
        {model && <SavedCarCard item={model} type="model" />}
        {used && <SavedCarCard item={used} type="used" />}
      </div>
    </PageShell>
  );
}
