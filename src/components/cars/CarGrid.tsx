import React, { useMemo } from "react";
import { Model } from "@/types/domain";
import { CarCard } from "./CarCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export interface CarGridProps {
  models: Model[];
  citySlug?: string;
  onClearFilters?: () => void;
  activeOfferModelIds?: string[] | Set<string>;
}

export function CarGrid({
  models,
  citySlug = "lucknow",
  onClearFilters,
  activeOfferModelIds,
}: CarGridProps) {
  const offerSet = useMemo(() => {
    if (!activeOfferModelIds) return new Set<string>();
    return activeOfferModelIds instanceof Set
      ? activeOfferModelIds
      : new Set(activeOfferModelIds);
  }, [activeOfferModelIds]);

  if (models.length === 0) {
    return (
      <EmptyState
        title="No vehicles match your criteria"
        description="Try adjusting your budget, fuel type, or body style filters to see available models."
        action={
          onClearFilters ? (
            <Button variant="secondary" size="sm" onClick={onClearFilters}>
              Reset Filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
      {models.map((model, idx) => (
        <CarCard
          key={model.id}
          model={model}
          citySlug={citySlug}
          hasActiveOffer={offerSet.has(model.id)}
          priority={idx < 3}
        />
      ))}
    </div>
  );
}
