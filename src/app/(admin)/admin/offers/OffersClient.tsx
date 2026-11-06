"use client";

import React, { useState } from "react";
import { Offer } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

interface OffersClientProps {
  initialOffers: Offer[];
}

export function OffersClient({ initialOffers }: OffersClientProps) {
  const [offers] = useState<Offer[]>(initialOffers);

  const columns: Column<Offer>[] = [
    {
      header: "Offer Title",
      cell: (o) => (
        <div>
          <span className="font-bold text-xs text-ink block">{o.title}</span>
          <span className="text-[11px] text-ink-soft line-clamp-1">{o.body}</span>
        </div>
      ),
    },
    {
      header: "Badge",
      cell: (o) => <Badge variant="accent" className="text-[10px]">{o.badge || "Standard"}</Badge>,
    },
    {
      header: "Validity",
      cell: (o) => <span className="text-xs font-mono">{o.valid_until}</span>,
    },
    {
      header: "Status",
      cell: (o) => (
        <Badge variant={o.active ? "ok" : "outline"} className="text-[10px]">
          {o.active ? "Active" : "Archived"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Marketing Offers & Schemes</h1>
          <p className="text-xs text-ink-soft">
            Manage festival discounts, corporate benefits, and warranty bundles.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Create Showroom Offer", 3)}>
          <Plus className="h-4 w-4" />
          <span>New Offer</span>
        </Button>
      </div>

      <DataTable columns={columns} data={offers} keyExtractor={(o) => o.id} />
    </div>
  );
}

