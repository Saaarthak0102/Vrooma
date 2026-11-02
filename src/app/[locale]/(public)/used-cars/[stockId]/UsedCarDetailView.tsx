"use client";

import React from "react";
import { UsedCar } from "@/types/domain";
import { PageShell } from "@/components/layout/PageShell";
import { Gallery } from "@/components/cars/Gallery";
import { InspectionReport } from "@/components/used/InspectionReport";
import { MaskedReg } from "@/components/used/MaskedReg";
import { OwnerKmYearBadges } from "@/components/used/OwnerKmYearBadges";
import { EmiCalculator } from "@/components/emi/EmiCalculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatINR } from "@/lib/money";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { ShieldCheck, Calendar, ArrowRight, RefreshCw, Ban } from "lucide-react";

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Photos & Inspection Report */}
        <div className="lg:col-span-7 space-y-8">
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

          {/* Photo Gallery */}
          <Gallery images={car.images} modelName={car.model_name} />

          {/* Inspection Report */}
          <div className="pt-6 border-t border-border">
            <InspectionReport inspection={car.inspection} stockId={car.stock_id} />
          </div>

          {/* EMI Calculator */}
          <div className="pt-6 border-t border-border space-y-4">
            <h3 className="text-lg font-bold text-ink">
              Used Car Finance & EMI Calculator
            </h3>
            <EmiCalculator initialPrice={car.price} showAmortisation={false} />
          </div>
        </div>

        {/* Right Column: Pricing & VIP Booking Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-border bg-white p-6 shadow-card space-y-6 sticky top-24">
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
        </div>
      </div>
    </PageShell>
  );
}

