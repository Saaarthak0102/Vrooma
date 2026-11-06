import React from "react";
import { Container } from "@/components/ui/container";
import { ListingCardSkeleton } from "@/components/listing/ListingCardSkeleton";

export default function UsedCarsLoading() {
  return (
    <div className="py-8 md:py-12">
      <Container>
        {/* Header skeleton */}
        <div className="mb-8 space-y-2">
          <div className="h-8 w-72 bg-stone-200 rounded-lg animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-stone-200 rounded animate-pulse" />
        </div>

        {/* Search & Sort skeleton */}
        <div className="mb-8 space-y-4">
          <div className="h-11 w-full max-w-md bg-stone-200 rounded-xl animate-pulse" />
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-stone-200 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-stone-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Card Grid skeleton matching 3/2/1 layout exactly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </div>
  );
}

