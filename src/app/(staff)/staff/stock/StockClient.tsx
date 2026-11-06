"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StockDrawer } from "@/components/staff/StockDrawer";
import { TradeInDrawer } from "@/components/staff/TradeInDrawer";
import { StockIntakeDialog } from "@/components/staff/StockIntakeDialog";
import { formatINR } from "@/lib/money";
import type { StockRow, TradeInRow } from "@/server/repositories/stock";

type Tab = "stock" | "tradeins";

const STATUS_LABEL: Record<string, string> = { available: "Available", booked: "Booked", sold: "Sold" };

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

export function StockClient({ stock, tradeIns }: { stock: StockRow[]; tradeIns: TradeInRow[] }) {
  const [tab, setTab] = useState<Tab>("stock");
  const [openCarId, setOpenCarId] = useState<string | null>(null);
  const [openTradeInId, setOpenTradeInId] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const openCar = stock.find((c) => c.id === openCarId) ?? null;
  const openTradeIn = tradeIns.find((t) => t.id === openTradeInId) ?? null;

  const available = stock.filter((c) => c.status === "available");
  const unscored = stock.filter((c) => c.status !== "sold" && c.inspection_score === null).length;
  const value = available.reduce((sum, c) => sum + c.price, 0);

  const stockColumns: GridColumn<StockRow>[] = [
    { id: "stock_id", header: "Stock ID", accessor: (c) => c.stock_id, cell: (c) => <span className="font-mono font-bold">{c.stock_id}</span> },
    {
      id: "car",
      header: "Car",
      accessor: (c) => `${c.model_name} ${c.variant_name}`,
      cell: (c) => (
        <span className="font-bold text-ink">
          {c.model_name} <span className="font-medium text-ink-soft">{c.variant_name}</span>
        </span>
      ),
    },
    { id: "year", header: "Year", accessor: (c) => c.year, align: "right" },
    { id: "km", header: "Km", accessor: (c) => c.km, align: "right", cell: (c) => c.km.toLocaleString("en-IN") },
    { id: "fuel", header: "Fuel", accessor: (c) => c.fuel, filter: "select", cell: (c) => <span className="capitalize">{c.fuel}</span> },
    { id: "owners", header: "Owners", accessor: (c) => c.owners, align: "right" },
    { id: "reg", header: "Reg.", accessor: (c) => c.reg_no_masked, cell: (c) => <span className="font-mono text-ink-soft">{c.reg_no_masked}</span> },
    { id: "price", header: "Price", accessor: (c) => c.price, align: "right", cell: (c) => <span className="font-bold">{formatINR(c.price)}</span> },
    {
      id: "score",
      header: "Inspection",
      accessor: (c) => c.inspection_score,
      align: "right",
      cell: (c) =>
        c.inspection_score === null ? (
          <Badge variant="outline" className="text-[10px]">
            Not scored
          </Badge>
        ) : (
          <Badge variant="ok" className="text-[10px]">
            {c.inspection_score}/100
          </Badge>
        ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (c) => STATUS_LABEL[c.status] ?? c.status,
      filter: "select",
      cell: (c) => (
        <Badge variant={c.status === "available" ? "ok" : c.status === "booked" ? "warn" : "secondary"} className="text-[10px]">
          {STATUS_LABEL[c.status] ?? c.status}
        </Badge>
      ),
    },
    { id: "yard", header: "Location", accessor: (c) => c.showroom_name ?? "-", filter: "select" },
  ];

  const tradeInColumns: GridColumn<TradeInRow>[] = [
    {
      id: "received",
      header: "Received",
      accessor: (t) => t.created_at,
      cell: (t) => dateFmt.format(new Date(t.created_at)),
    },
    { id: "customer", header: "Customer", accessor: (t) => t.customer_name ?? "-", cell: (t) => <span className="font-bold text-ink">{t.customer_name ?? "-"}</span> },
    { id: "phone", header: "Phone", accessor: (t) => t.customer_phone ?? "-" },
    { id: "car", header: "Car", accessor: (t) => `${t.make} ${t.model}` },
    { id: "year", header: "Year", accessor: (t) => t.year, align: "right" },
    { id: "km", header: "Km", accessor: (t) => t.km, align: "right", cell: (t) => t.km.toLocaleString("en-IN") },
    { id: "condition", header: "Condition", accessor: (t) => t.condition, filter: "select", cell: (t) => <span className="capitalize">{t.condition}</span> },
    { id: "photos", header: "Photos", accessor: (t) => t.photo_count, align: "right" },
    { id: "owner", header: "Consultant", accessor: (t) => t.consultant_name ?? "Unassigned", filter: "select" },
    { id: "stage", header: "Lead stage", accessor: (t) => (t.lead_status ?? "-").replace("_", " "), filter: "select", cell: (t) => <span className="capitalize">{(t.lead_status ?? "-").replace("_", " ")}</span> },
  ];

  const tabClass = (active: boolean) =>
    `inline-flex h-11 items-center rounded-md px-4 text-xs font-bold ${active ? "bg-dark text-white" : "text-ink-soft hover:bg-ink/5"}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In stock" value={stock.filter((c) => c.status !== "sold").length} subtitle="Available or booked" />
        <StatCard label="Available" value={available.length} subtitle={`${formatINR(value)} listed`} />
        <StatCard label="Not yet scored" value={unscored} subtitle="Need an inspection" />
        <StatCard label="Trade-in requests" value={tradeIns.length} subtitle="From the website" />
      </div>

      <div role="tablist" aria-label="Used stock views" className="flex items-center gap-1">
        <button role="tab" aria-selected={tab === "stock"} className={tabClass(tab === "stock")} onClick={() => setTab("stock")}>
          Stock ({stock.length})
        </button>
        <button role="tab" aria-selected={tab === "tradeins"} className={tabClass(tab === "tradeins")} onClick={() => setTab("tradeins")}>
          Trade-ins ({tradeIns.length})
        </button>
      </div>

      {tab === "stock" ? (
        <DataGrid
          columns={stockColumns}
          rows={stock}
          rowKey={(c) => c.id}
          onRowClick={(c) => setOpenCarId(c.id)}
          activeRowKey={openCarId}
          searchPlaceholder="Search stock ID, model, plate…"
          exportName="used-stock"
          emptyMessage="No vehicles in stock yet. Add the first one."
          toolbar={
            <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setIntakeOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add vehicle
            </Button>
          }
        />
      ) : (
        <DataGrid
          columns={tradeInColumns}
          rows={tradeIns}
          rowKey={(t) => t.id}
          onRowClick={(t) => setOpenTradeInId(t.id)}
          activeRowKey={openTradeInId}
          searchPlaceholder="Search customer, car…"
          exportName="trade-ins"
          emptyMessage="No trade-in requests yet."
        />
      )}

      <StockDrawer car={openCar} onClose={() => setOpenCarId(null)} />
      <TradeInDrawer request={openTradeIn} onClose={() => setOpenTradeInId(null)} />
      <StockIntakeDialog open={intakeOpen} onOpenChange={setIntakeOpen} />
    </div>
  );
}
