"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { Model } from "@/types/domain";
import { Plus, Edit, Eye } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

interface ModelsClientProps {
  initialModels: Model[];
}

export function ModelsClient({ initialModels }: ModelsClientProps) {
  const [models] = useState<Model[]>(initialModels);

  const columns: Column<Model>[] = [
    {
      header: "Model Name",
      cell: (m) => (
        <div>
          <span className="font-bold text-sm text-ink block">{m.name}</span>
          <span className="text-[11px] text-ink-mute font-mono">{m.slug}</span>
        </div>
      ),
    },
    {
      header: "Body Type",
      cell: (m) => <Badge variant="secondary" className="uppercase text-[10px]">{m.body_type}</Badge>,
    },
    {
      header: "Ex-Showroom Range",
      cell: (m) => (
        <span className="font-semibold text-xs">
          {formatINR(m.min_price)} – {formatINR(m.max_price)}
        </span>
      ),
    },
    {
      header: "Variants",
      cell: (m) => <span>{m.variants?.length || 0} active</span>,
    },
    {
      header: "Status",
      cell: (m) => (
        <Badge variant={m.is_active ? "ok" : "outline"} className="text-[10px]">
          {m.is_active ? "Live" : "Draft"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (m) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link href={`/admin/models/${m.id}`}>
              <Edit className="h-3.5 w-3.5 mr-1" />
              <span>Edit</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link href={`/cars/${m.slug}`} target="_blank">
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
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Model Catalog Management</h1>
          <p className="text-xs text-ink-soft">
            Manage Brand X passenger vehicle models, variant specifications, and color galleries.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Create New Model", 3)}>
          <Plus className="h-4 w-4" />
          <span>Add New Model</span>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={models}
        keyExtractor={(m) => m.id}
      />
    </div>
  );
}

