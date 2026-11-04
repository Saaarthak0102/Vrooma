"use client";

import React, { useState } from "react";
import { Banner } from "@/types/domain";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

interface BannersClientProps {
  initialBanners: Banner[];
}

export function BannersClient({ initialBanners }: BannersClientProps) {
  const [banners] = useState<Banner[]>(initialBanners);

  const columns: Column<Banner>[] = [
    {
      header: "Banner Title",
      cell: (b) => <span className="font-bold text-xs text-ink">{b.title}</span>,
    },
    {
      header: "Target URL",
      cell: (b) => <span className="font-mono text-xs text-ink-mute">{b.href}</span>,
    },
    {
      header: "Sort Order",
      cell: (b) => <span className="font-bold text-xs">{b.sort}</span>,
    },
    {
      header: "Status",
      cell: (b) => (
        <Badge variant={b.active ? "ok" : "outline"} className="text-[10px]">
          {b.active ? "Published" : "Hidden"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Homepage Carousel Banners</h1>
          <p className="text-xs text-ink-soft">
            Manage seasonal hero graphics and promotional call-to-action cards.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Upload New Banner", 3)}>
          <Plus className="h-4 w-4" />
          <span>Upload Banner</span>
        </Button>
      </div>

      <DataTable columns={columns} data={banners} keyExtractor={(b) => b.id} />
    </div>
  );
}

