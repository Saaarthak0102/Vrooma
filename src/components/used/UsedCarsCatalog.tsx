"use client";

import React, { useState, useMemo } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { UsedCarCard } from "@/components/used/UsedCarCard";
import { UsedFilters, UsedFilterValues } from "@/components/used/UsedFilters";
import { SearchBox } from "@/components/cars/SearchBox";
import { SortSelect } from "@/components/cars/SortSelect";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { UsedCar } from "@/types/domain";

export function UsedCarsCatalog({ cars }: { cars: UsedCar[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("price_asc");
  const [filters, setFilters] = useState<UsedFilterValues>({
    modelId: "all",
    fuel: "all",
    minYear: null,
    maxKm: null,
    maxPrice: null,
  });

  const handleFilterChange = (key: keyof UsedFilterValues, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setSearch("");
    setSort("price_asc");
    setFilters({
      modelId: "all",
      fuel: "all",
      minYear: null,
      maxKm: null,
      maxPrice: null,
    });
  };

  const filteredCars = useMemo(() => {
    let list = [...cars];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.model_name.toLowerCase().includes(q) ||
          c.variant_name.toLowerCase().includes(q) ||
          c.stock_id.toLowerCase().includes(q)
      );
    }

    if (filters.modelId !== "all") {
      list = list.filter((c) => c.model_id === filters.modelId);
    }

    if (filters.fuel !== "all") {
      list = list.filter((c) => c.fuel === filters.fuel);
    }

    if (filters.maxKm) {
      list = list.filter((c) => c.km <= filters.maxKm!);
    }

    if (filters.maxPrice) {
      list = list.filter((c) => c.price <= filters.maxPrice!);
    }

    if (sort === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === "year_desc") {
      list.sort((a, b) => b.year - a.year);
    } else if (sort === "km_asc") {
      list.sort((a, b) => a.km - b.km);
    } else {
      list.sort((a, b) => a.price - b.price);
    }

    return list;
  }, [cars, search, sort, filters]);

  return (
    <PageShell
      title="Certified Pre-Owned Cars in Lucknow"
      subtitle="140-point mechanically verified, non-accidental guarantee, and transparent documentation."
      breadcrumbs={[{ label: "Used Cars" }]}
    >
      <div className="space-y-6">
        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search stock ID (UC-1182), model..."
            className="w-full sm:max-w-md"
          />
          <div className="w-full sm:w-auto flex justify-end">
            <SortSelect value={sort} onChange={setSort} />
          </div>
        </div>

        {/* Filter Bar */}
        <UsedFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Result Counter */}
        <div className="text-xs text-ink-mute">
          Showing <strong>{filteredCars.length}</strong> certified vehicles available in Lucknow
        </div>

        {/* Grid */}
        {filteredCars.length === 0 ? (
          <EmptyState
            title="No pre-owned cars match your criteria"
            description="Try relaxing your filters or check back soon as our stock updates daily."
            action={
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Reset Filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filteredCars.map((car, idx) => (
              <UsedCarCard key={car.id} car={car} priority={idx < 3} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
