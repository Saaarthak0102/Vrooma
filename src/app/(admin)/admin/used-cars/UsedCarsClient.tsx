"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UsedCar } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { MaskedReg } from "@/components/used/MaskedReg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { Plus, Edit, Eye, Sparkles } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

interface UsedCarsClientProps {
  initialUsedCars: UsedCar[];
}

export function UsedCarsClient({ initialUsedCars }: UsedCarsClientProps) {
  const [usedCars] = useState<UsedCar[]>(initialUsedCars);

  const columns: Column<UsedCar>[] = [
    {
      header: "Stock ID / Vehicle",
      cell: (c) => (
        <div>
          <span className="font-mono font-bold text-xs text-ink block">{c.stock_id}</span>
          <span className="text-sm font-semibold text-ink">
            {c.year} {c.model_name} {c.variant_name}
          </span>
        </div>
      ),
    },
    {
      header: "Registration",
      cell: (c) => (
        <div>
          <MaskedReg regNo={c.reg_no_masked} showIcon={false} />
          {c.reg_no_private && (
            <span className="text-[10px] text-ink-mute block font-mono mt-0.5">
              Private: {c.reg_no_private}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Km / Owners",
      cell: (c) => (
        <span className="text-xs text-ink-soft">
          {c.km.toLocaleString()} km · {c.owners} owner(s)
        </span>
      ),
    },
    {
      header: "Listed Price",
      cell: (c) => (
        <span className="font-bold text-xs text-ink">
          {formatINR(c.price)}
        </span>
      ),
    },
    {
      header: "Inspection",
      cell: (c) => (
        <div className="flex items-center gap-1.5">
          {typeof c.inspection_score === "number" ? (
            <>
              <Badge variant="ok" className="text-[10px]">
                {c.inspection_score}/100
              </Badge>
              <span className="text-[10px] text-ink-mute">140-pt</span>
            </>
          ) : (
            // Never invent a score: an unscored car says so.
            <Badge variant="outline" className="text-[10px]">
              Not scored
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (c) => {
        const variants: Record<string, "ok" | "accent" | "outline"> = {
          available: "ok",
          booked: "accent",
          sold: "outline",
        };
        return (
          <Badge variant={variants[c.status] || "outline"} className="text-[10px] capitalize">
            {c.status}
          </Badge>
        );
      },
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link href={`/admin/used-cars/${c.id}`}>
              <Edit className="h-3.5 w-3.5 mr-1" />
              <span>Edit</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link href={`/used-cars/${c.stock_id}`} target="_blank">
              <Eye className="h-3.5 w-3.5 mr-1" />
              <span>Preview</span>
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Certified Used Inventory</h1>
          <p className="text-xs text-ink-soft">
            Shaheed Path Used-Car Yard stock with 140-point inspection dossiers and masked registrations.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Intake Used Car", 3)}>
          <Plus className="h-4 w-4" />
          <span>Vehicle Intake</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border p-4 bg-bg-sheen/50 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent-ink shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-ink">Used-Car Manager Authority Guarantee</h4>
          <p className="text-[11px] text-ink-mute mt-0.5">
            AI price valuation bands are strictly restricted to the Used-Car Manager. The manager retains sole authority over final retail asking prices.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={usedCars}
        keyExtractor={(c) => c.id}
      />
    </div>
  );
}

