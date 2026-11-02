import React from "react";
import { Model } from "@/types/domain";
import { CarCard } from "./CarCard";

export interface SimilarCarsProps {
  currentModelId: string;
  models: Model[];
}

export function SimilarCars({ currentModelId, models }: SimilarCarsProps) {
  const similar = models.filter((m) => m.id !== currentModelId).slice(0, 3);
  if (similar.length === 0) return null;

  return (
    <div className="space-y-4 pt-12 border-t border-border mt-12">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-ink">
            Explore Other Models
          </h3>
          <p className="text-xs text-ink-soft">
            Compare with other vehicles in our official showroom lineup
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {similar.map((model) => (
          <CarCard key={model.id} model={model} />
        ))}
      </div>
    </div>
  );
}

