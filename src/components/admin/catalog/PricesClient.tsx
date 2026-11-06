"use client";

import React, { useState } from "react";
import { PriceRule } from "@/types/domain";
import { computeOnRoad } from "@/lib/price-engine";
import { formatINR } from "@/lib/money";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/PhoneField";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Calculator, Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PriceRuleDialog, PriceRuleModelOption } from "@/components/admin/PriceRuleDialog";
import { deletePriceRuleAction } from "@/server/actions/admin-catalog";
import { KANPUR_CITY_ID } from "@/lib/cities";

interface PricesClientProps {
  initialRules: PriceRule[];
  models: PriceRuleModelOption[];
}

export function PricesClient({ initialRules, models }: PricesClientProps) {
  const router = useRouter();
  const confirm = useConfirm();
  // Rules come straight from the server component, so router.refresh() after a save shows the new table.
  const rules = initialRules;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);

  const modelName = (id?: string | null) => models.find((m) => m.id === id)?.name;
  const variantName = (id?: string | null) =>
    models.flatMap((m) => m.variants).find((v) => v.id === id)?.name;

  const openCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };
  const openEdit = (rule: PriceRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };
  const handleDelete = async (rule: PriceRule) => {
    const ok = await confirm({
      title: "Delete this price rule?",
      description:
        "Buyers in this city lose the on-road breakup for this scope until another rule covers it. This is recorded in the audit log.",
      confirmLabel: "Delete rule",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    const res = await deletePriceRuleAction(rule.id);
    if (!res.ok) {
      toast.error(res.error?.message ?? "Could not delete the rule.");
      return;
    }
    toast.success("Price rule deleted.");
    router.refresh();
  };
  const [previewVariantPrice, setPreviewVariantPrice] = useState(1245000); // Sample NEW-H-02
  const [activePreviewRule, setActivePreviewRule] = useState<PriceRule>(
    rules[0] || {
      id: "fallback",
      city_id: "c0000001-0000-0000-0000-000000000001",
      road_tax_pct: 10,
      registration: 12000,
      insurance: 42000,
      handling: 8500,
      accessories: 15000,
      tcs_pct: 1,
      valid_from: "2026-01-01",
      valid_until: "2026-12-31",
    }
  );

  const previewBreakup = computeOnRoad({
    variant: { id: "test", name: "Sample Car (₹12.45L)", ex_showroom: previewVariantPrice },
    rule: activePreviewRule,
    includeAccessories: true,
  });

  const scopeLabel = (r: PriceRule) =>
    r.variant_id
      ? `${modelName(r.model_id) ?? "Model"} · ${variantName(r.variant_id) ?? "Variant"}`
      : r.model_id
        ? `${modelName(r.model_id) ?? "Model"} (all variants)`
        : "All models (city-wide)";

  const columns: GridColumn<PriceRule>[] = [
    {
      id: "city",
      header: "City",
      accessor: (r) => (r.city_id === KANPUR_CITY_ID ? "Kanpur" : "Lucknow"),
      filter: "select",
      cell: (r) => <span className="font-bold text-ink">{r.city_id === KANPUR_CITY_ID ? "Kanpur" : "Lucknow"}</span>,
    },
    {
      id: "scope",
      header: "Applies to",
      accessor: (r) => scopeLabel(r) + (r.fuel ? ` ${r.fuel}` : ""),
      cell: (r) => (
        <span className="font-medium">
          {scopeLabel(r)}
          {r.fuel ? <span className="ml-1 text-[11px] capitalize text-ink-mute">({r.fuel} only)</span> : null}
        </span>
      ),
    },
    { id: "tax", header: "Road tax", accessor: (r) => r.road_tax_pct, align: "right", cell: (r) => <span className="font-mono font-bold">{r.road_tax_pct}%</span> },
    { id: "reg", header: "Registration", accessor: (r) => r.registration, align: "right", cell: (r) => formatINR(r.registration) },
    { id: "ins", header: "Insurance", accessor: (r) => r.insurance, align: "right", cell: (r) => formatINR(r.insurance) },
    { id: "handling", header: "Handling", accessor: (r) => r.handling, align: "right", cell: (r) => formatINR(r.handling) },
    { id: "acc", header: "Accessories", accessor: (r) => r.accessories, align: "right", cell: (r) => formatINR(r.accessories) },
    { id: "tcs", header: "TCS", accessor: (r) => r.tcs_pct ?? 0, align: "right", cell: (r) => `${r.tcs_pct ?? 0}%` },
    {
      id: "validity",
      header: "Valid",
      accessor: (r) => r.valid_from,
      cell: (r) => (
        <span className="text-ink-soft">
          {r.valid_from} to {r.valid_until}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      sortable: false,
      accessor: () => "",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="text-xs h-9 px-2.5 gap-1"
            onClick={() => {
              setActivePreviewRule(r);
              toast.info("Simulator now uses this rule.");
            }}
          >
            <Calculator className="h-3 w-3" />
            <span>Simulate</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 px-2.5 gap-1"
            onClick={() => openEdit(r)}
            aria-label="Edit rule"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-9 w-9 px-0 text-danger hover:bg-danger/10"
            onClick={() => handleDelete(r)}
            aria-label="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PriceRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingRule}
        models={models}
      />

      {/* Live Interactive Simulation Widget */}
      <div className="rounded-2xl border border-accent/40 bg-accent-soft/20 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-accent-ink" />
            <h3 className="text-sm font-bold text-ink">
              Live Price Engine Simulator (Rule: {activePreviewRule.id.slice(0, 18)}...)
            </h3>
          </div>
          <Badge variant="accent" className="text-xs font-mono">
            Pure Function Test
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 space-y-2">
            <FormField label="Ex-Showroom Price to Simulate (INR)">
              <Input
                type="number"
                value={previewVariantPrice}
                onChange={(e) => setPreviewVariantPrice(parseInt(e.target.value, 10) || 0)}
                className="bg-white text-sm font-bold"
              />
            </FormField>
            <p className="text-[11px] text-ink-mute">
              Calculates RTO Road Tax ({activePreviewRule.road_tax_pct}%), Registration, Insurance & TCS.
            </p>
          </div>

          <div className="md:col-span-7 bg-white rounded-xl border border-border p-4 space-y-2 text-xs">
            {previewBreakup ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-ink-soft">Simulated Total On-Road:</span>
                  <span className="text-xl font-extrabold text-ink">
                    {formatINR(previewBreakup.total)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-mute pt-1">
                  {previewBreakup.lines.map((l) => (
                    <div key={l.key} className="flex justify-between">
                      <span>{l.label}:</span>
                      <span className="font-semibold text-ink">{formatINR(l.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-danger italic text-center py-2">
                Simulation Rule Expired or Invalid Date Range.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Every on-road quote a buyer sees is computed from these rows. */}
      <DataGrid
        columns={columns}
        rows={rules}
        rowKey={(r) => r.id}
        searchPlaceholder="Search city, model…"
        exportName="price-rules"
        emptyMessage="No price rules yet. Buyers cannot see on-road prices until one exists."
        toolbar={
          <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            New price rule
          </Button>
        }
      />
    </div>
  );
}

