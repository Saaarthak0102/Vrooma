"use client";

import React, { useState } from "react";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { UsedCar } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { MaskedReg } from "@/components/used/MaskedReg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { Plus, Edit, Eye, Sparkles } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function AdminUsedCarsPage() {
  const [usedCars] = useState<UsedCar[]>(memoryStore.usedCars);

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
      header: "Manager Price",
      cell: (c) => (
        <span className="font-bold text-sm text-ink">{formatINR(c.price)}</span>
      ),
    },
    {
      header: "Status",
      cell: (c) => (
        <Badge
          variant={c.status === "available" ? "ok" : c.status === "booked" ? "danger" : "secondary"}
          className="text-[10px] capitalize"
        >
          {c.status}
        </Badge>
      ),
    },
    {
      header: "Inspection",
      cell: (c) => (
        <span className="text-xs font-semibold text-accent-ink">
          {c.inspection.score}/100 Score
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="secondary" size="sm" className="h-8 text-xs gap-1">
            <Link href={`/admin/used-cars/${c.id}`}>
              <Sparkles className="h-3 w-3 text-accent-ink" />
              <span>AI Valuation</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
            <Link href={`/used-cars/${c.stock_id}`} target="_blank">
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Certified Pre-Owned Inventory</h1>
          <p className="text-xs text-ink-soft">
            Manage intake valuation, inspection checklists, and manager-only AI price bands.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Intake Used Car", 3)}>
          <Plus className="h-4 w-4" />
          <span>Intake Used Car</span>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={usedCars}
        keyExtractor={(c) => c.id}
      />
    </div>
  );
}

