"use client";

import React, { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { SavedCarCard } from "@/components/dashboard/SavedCarCard";
import { listSavedVehicles, SavedVehicleRecord } from "@/server/repositories/saved";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Bookmark } from "lucide-react";

export default function DashboardSavedPage() {
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSavedVehicles().then((records) => {
      setSavedVehicles(records);
      setLoading(false);
    });
  }, []);

  return (
    <PageShell
      title="Saved Vehicles"
      subtitle="Quick access to new models and certified pre-owned vehicles you have bookmarked."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Saved Vehicles" }]}
    >
      <div className="space-y-4 max-w-2xl">
        {!loading && savedVehicles.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-10 w-10 text-ink-mute" />}
            title="Save cars to compare them later"
            description="You have not bookmarked any new models or certified pre-owned cars yet."
            action={
              <Button asChild variant="primary" size="sm">
                <Link href="/cars">Browse Cars</Link>
              </Button>
            }
          />
        ) : (
          savedVehicles.map((record) => (
            <SavedCarCard key={record.id} item={record.item} type={record.type} />
          ))
        )}
      </div>
    </PageShell>
  );
}

