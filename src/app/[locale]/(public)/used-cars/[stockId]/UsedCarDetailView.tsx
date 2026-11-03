"use client";

import React from "react";
import { UsedCar } from "@/types/domain";
import { PageShell } from "@/components/layout/PageShell";
import { Gallery } from "@/components/cars/Gallery";
import { MaskedReg } from "@/components/used/MaskedReg";
import { OwnerKmYearBadges } from "@/components/used/OwnerKmYearBadges";
import { InspectionSummaryCard } from "@/components/used/InspectionSummaryCard";
import { VehicleConditionReport } from "@/components/used/VehicleConditionReport";
import { ModelEmiCalculator } from "@/components/cars/ModelEmiCalculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatINR } from "@/lib/money";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { ShieldCheck, Calendar, RefreshCw, Ban } from "lucide-react";

export function UsedCarDetailView({ car }: { car: UsedCar }) {
  const { requireAuth } = useRequireAuth();
  const isBooked = car.status === "booked";

  return (
    <PageShell
      breadcrumbs={[
        { label: "Used Cars", href: "/used-cars" },
        { label: `${car.model_name} (${car.stock_id})` },
      ]}
      className="pb-24"
    >
      {/* =========================================================================
          SECTION A — VEHICLE OVERVIEW
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Photos & Vehicle Identity */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {car.stock_id}
                </Badge>
                {car.certified && (
                  <Badge variant="accent" className="gap-1 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Vrooma Certified</span>
                  </Badge>
                )}
              </div>
              <MaskedReg regNo={car.reg_no_masked} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              {car.year} {car.model_name}{" "}
              <span className="font-semibold text-ink-soft">{car.variant_name}</span>
            </h1>

            <div className="mt-3">
              <OwnerKmYearBadges year={car.year} km={car.km} owners={car.owners} />
            </div>
          </div>

          {/* Photo Gallery Frame (Preserved unchanged) */}
          <Gallery images={car.images} modelName={car.model_name} />
        </div>

        {/* Right Column: Certified Fixed Price & 140-Point Inspection Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Certified Fixed Price Card (Preserved unchanged) */}
          <div className="rounded-xl border border-border bg-white p-6 shadow-card space-y-6">
            <div>
              <span className="text-xs text-ink-mute uppercase font-semibold block">
                Certified Fixed Price
              </span>
              <div className="text-3xl sm:text-4xl font-black text-ink mt-1">
                {formatINR(car.price)}
              </div>
              <p className="text-xs text-ink-soft mt-1">
                Zero hidden fees · Transfer & RC endorsement assistance included
              </p>
            </div>

            {/* Status Notice */}
            {isBooked ? (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 text-center space-y-1">
                <span className="text-xs font-bold text-danger flex items-center justify-center gap-1.5">
                  <Ban className="h-4 w-4" />
                  Currently Reserved / Booked
                </span>
                <p className="text-[11px] text-danger/80">
                  A deposit has been placed on this vehicle. Check other similar inventory.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  asChild
                  variant="primary"
                  className="w-full h-12 text-sm font-bold gap-2"
                >
                  <Link href={`/book/test-drive?usedCar=${car.stock_id}`}>
                    <Calendar className="h-4 w-4" />
                    <span>Book VIP Viewing & Test Drive</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full h-11 text-xs gap-1.5"
                >
                  <Link href="/trade-in">
                    <RefreshCw className="h-3.5 w-3.5 text-accent-ink" />
                    <span>Exchange Your Existing Car Towards This</span>
                  </Link>
                </Button>
              </div>
            )}

            {/* Assurance Points */}
            <div className="pt-4 border-t border-border space-y-2.5 text-xs text-ink-soft">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-ink shrink-0" />
                <span>6 Months / 7,500 km Comprehensive Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-ink shrink-0" />
                <span>Non-accidental, non-meter-tampered legal guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-ink shrink-0" />
                <span>Available for physical inspection at Hazratganj yard</span>
              </div>
            </div>
          </div>

          {/* 2. Relocated 140-Point Inspection Summary Card */}
          <InspectionSummaryCard
            inspection={car.inspection}
            stockId={car.stock_id}
          />
        </div>
      </div>

      {/* =========================================================================
          SECTION B — VEHICLE CONDITION & FINANCING (TWO-COLUMN 50/50 SECTION)
         ========================================================================= */}
      <section className="mt-14 pt-12 border-t border-border/80 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
            Vehicle Condition & Financing
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft mt-1">
            Detailed inspection records and flexible financing options for this certified pre-owned vehicle.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Detailed Vehicle Condition & Inspection Records */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                Inspection & Condition Dossier
              </span>
              <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                140 Checkpoints Logged
              </span>
            </div>

            <VehicleConditionReport car={car} className="flex-1" />
          </div>

          {/* Right Column: Exact New Cars EMI Calculator Adapted to Used Vehicle */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                Used Car Financing & EMI Estimator
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Flexible Tenure (12–84 Mo)
              </span>
            </div>

            <ModelEmiCalculator
              vehiclePrice={car.price}
              vehicleLabel={`${car.year} ${car.model_name} ${car.variant_name}`}
              stockId={car.stock_id}
              pricingBasis="certified-used-price"
              className="flex-1"
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
