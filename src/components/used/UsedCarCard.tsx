import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { UsedCar } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaskedReg } from "./MaskedReg";
import { OwnerKmYearBadges } from "./OwnerKmYearBadges";
import { ShieldCheck, ArrowRight, Ban } from "lucide-react";

export interface UsedCarCardProps {
  car: UsedCar;
  className?: string;
}

export function UsedCarCard({ car, className }: UsedCarCardProps) {
  const isBooked = car.status === "booked";
  const mainImage = car.images[0] || "/images/placeholders/car-2.svg";

  return (
    <div
      className={`group rounded-lg border border-border bg-white p-5 shadow-card hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
        isBooked ? "opacity-90 bg-ink/[0.01]" : ""
      } ${className}`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              {car.stock_id}
            </Badge>
            {car.certified && (
              <Badge variant="accent" className="gap-1 text-[10px]">
                <ShieldCheck className="h-3 w-3" />
                <span>Certified</span>
              </Badge>
            )}
          </div>
          {isBooked ? (
            <Badge variant="danger" className="text-[10px] gap-1">
              <Ban className="h-3 w-3" />
              <span>Booked</span>
            </Badge>
          ) : (
            <span className="text-xs text-accent-ink font-semibold">Available</span>
          )}
        </div>

        {/* Car Image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-ink/[0.03] mb-4">
          <Image
            src={mainImage}
            alt={`${car.model_name} ${car.variant_name}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Title & Variant */}
        <h3 className="text-lg font-bold tracking-tight text-ink group-hover:text-accent-ink transition-colors">
          {car.model_name} <span className="font-medium text-ink-soft">{car.variant_name}</span>
        </h3>

        {/* Masked Registration */}
        <div className="mt-1.5 mb-3">
          <MaskedReg regNo={car.reg_no_masked} />
        </div>

        {/* Badges: Year, Km, Owners */}
        <div className="mb-4">
          <OwnerKmYearBadges year={car.year} km={car.km} owners={car.owners} />
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="pt-3 border-t border-border mt-auto">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-xs text-ink-mute block">Price</span>
            <span className="text-xl font-extrabold text-ink">{formatINR(car.price)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-ink-mute block">Inspection</span>
            <span className="text-xs font-bold text-accent-ink">
              {car.inspection.score}/100 Score
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary" size="sm" className="text-xs">
            <Link href={`/used-cars/${car.stock_id}`}>Report & Specs</Link>
          </Button>

          {isBooked ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs opacity-60 cursor-not-allowed"
            >
              Booked
            </Button>
          ) : (
            <Button asChild variant="primary" size="sm" className="text-xs gap-1">
              <Link href={`/book/test-drive?usedCar=${car.stock_id}`}>
                <span>Book VIP View</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

