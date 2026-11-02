"use client";

import React, { useState, useMemo } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { CarGrid } from "@/components/cars/CarGrid";
import { FilterBar, FilterValues } from "@/components/cars/FilterBar";
import { FilterSheet } from "@/components/cars/FilterSheet";
import { SearchBox } from "@/components/cars/SearchBox";
import { SortSelect } from "@/components/cars/SortSelect";
import { mockModels } from "@/data/mock/models";

export default function CarsPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("price_asc");
  const [filters, setFilters] = useState<FilterValues>({
    bodyType: "all",
    fuel: "all",
    city: "lucknow",
    maxBudget: null,
  });

  const handleFilterChange = (key: keyof FilterValues, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setSearch("");
    setSort("price_asc");
    setFilters({
      bodyType: "all",
      fuel: "all",
      city: "lucknow",
      maxBudget: null,
    });
  };

  const filteredModels = useMemo(() => {
    let list = [...mockModels];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.tagline.toLowerCase().includes(q) ||
          m.variants?.some((v) => v.name.toLowerCase().includes(q))
      );
    }

    if (filters.bodyType !== "all") {
      list = list.filter((m) => m.body_type === filters.bodyType);
    }

    if (filters.fuel !== "all") {
      list = list.filter((m) =>
        m.variants?.some((v) => v.fuel === filters.fuel)
      );
    }

    if (filters.maxBudget) {
      list = list.filter((m) => (m.min_price ?? 0) <= filters.maxBudget!);
    }

    if (sort === "price_desc") {
      list.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0));
    } else if (sort === "newest") {
      list.sort((a, b) => b.id.localeCompare(a.id));
    } else {
      list.sort((a, b) => (a.min_price ?? 0) - (b.min_price ?? 0));
    }

    return list;
  }, [search, sort, filters]);

  return (
    <PageShell
      title="Brand X New Car Lineup"
      subtitle="Explore official Lucknow inventory, compare technical specifications, and calculate exact on-road prices by city."
      breadcrumbs={[{ label: "New Cars" }]}
    >
      <div className="space-y-6">
        {/* Top Controls: Search + Sort + Mobile Filter Trigger */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search Model H, Model C, engine specs..."
            className="w-full md:max-w-md"
          />
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <FilterSheet
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
              resultsCount={filteredModels.length}
            />
            <SortSelect value={sort} onChange={setSort} />
          </div>
        </div>

        {/* Desktop Filter Bar */}
        <div className="hidden md:block">
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-ink-mute">
          <span>
            Showing <strong>{filteredModels.length}</strong> vehicles in{" "}
            <span className="capitalize text-ink font-semibold">{filters.city}</span>
          </span>
        </div>

        {/* Car Grid */}
        <CarGrid
          models={filteredModels}
          citySlug={filters.city}
          onClearFilters={handleReset}
        />
      </div>
    </PageShell>
  );
}

