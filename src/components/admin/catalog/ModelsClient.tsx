"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Plus } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import type { AdminModel } from "@/server/repositories/admin-models";
import { ModelCreateDialog } from "@/components/admin/ModelCreateDialog";

export function ModelsClient({ initialModels }: { initialModels: AdminModel[] }) {
  const router = useRouter();
  // Straight from the server component so router.refresh() after a save updates the table.
  const models = initialModels;
  const [createOpen, setCreateOpen] = useState(false);

  const columns: GridColumn<AdminModel>[] = [
    {
      id: "name",
      header: "Model",
      accessor: (m) => m.name,
      cell: (m) => (
        <span>
          <span className="font-bold text-ink">{m.name}</span>{" "}
          <span className="font-mono text-[11px] text-ink-mute">{m.slug}</span>
        </span>
      ),
    },
    {
      id: "body",
      header: "Body",
      accessor: (m) => m.body_type,
      filter: "select",
      cell: (m) => (
        <Badge variant="secondary" className="text-[10px] uppercase">
          {m.body_type}
        </Badge>
      ),
    },
    {
      id: "range",
      header: "Ex-showroom",
      accessor: (m) => m.min_price ?? null,
      align: "right",
      cell: (m) =>
        m.min_price !== undefined && m.max_price !== undefined ? (
          <span className="font-semibold">
            {formatINR(m.min_price)} – {formatINR(m.max_price)}
          </span>
        ) : (
          <span className="text-ink-mute">No live variants</span>
        ),
    },
    {
      id: "variants",
      header: "Variants",
      accessor: (m) => m.variants.length,
      align: "right",
      cell: (m) => {
        const live = m.variants.filter((v) => v.is_active).length;
        return (
          <span>
            {live} live{m.variants.length > live ? `, ${m.variants.length - live} hidden` : ""}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessor: (m) => (m.is_active ? "Live" : "Draft"),
      filter: "select",
      cell: (m) => (
        <Badge variant={m.is_active ? "ok" : "outline"} className="text-[10px]">
          {m.is_active ? "Live" : "Draft"}
        </Badge>
      ),
    },
    {
      id: "preview",
      header: "",
      sortable: false,
      accessor: () => "",
      cell: (m) => (
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
          <Link href={`/cars/${m.slug}`} target="_blank" onClick={(e) => e.stopPropagation()}>
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataGrid
        columns={columns}
        rows={models}
        rowKey={(m) => m.id}
        onRowClick={(m) => router.push(`/admin/catalog?tab=models&model=${m.id}`)}
        searchPlaceholder="Search models…"
        exportName="models"
        emptyMessage="No models yet. Add the first one."
        toolbar={
          <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add model
          </Button>
        }
      />
      <ModelCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
