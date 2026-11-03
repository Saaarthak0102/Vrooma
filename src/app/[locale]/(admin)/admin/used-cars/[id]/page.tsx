"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { PriceSuggestionCard } from "@/components/admin/PriceSuggestionCard";
import { FormField } from "@/components/forms/PhoneField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Save, Code } from "lucide-react";

export default function AdminUsedCarDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const car = memoryStore.usedCars.find((c) => c.id === id) || memoryStore.usedCars[0];

  const [km, setKm] = useState(car.km.toString());
  const [status, setStatus] = useState(car.status);
  const [inspectionJson, setInspectionJson] = useState(
    JSON.stringify(car.inspection, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSaveCar = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("loading");
    try {
      JSON.parse(inspectionJson);
      setJsonError(null);
      setTimeout(() => {
        setSaveStatus("success");
        toast.success(`Used car ${car.stock_id} record and inspection updated.`);
        setTimeout(() => setSaveStatus("idle"), 1400);
      }, 350);
    } catch {
      setJsonError("Invalid JSON format in inspection field");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 600);
      toast.error("Invalid JSON format in inspection field");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <Link
          href="/admin/used-cars"
          className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Used Stock</span>
        </Link>
        <span className="text-xs font-mono font-bold text-ink">Stock: {car.stock_id}</span>
      </div>

      {/* Manager-Only AI Price Band Recommendation */}
      <PriceSuggestionCard car={car} />

      {/* Used Car Stock & Inspection JSON Editor */}
      <form onSubmit={handleSaveCar} className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
        <h3 className="text-base font-bold text-ink">Stock Details & Inspection Audit</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Kilometers Driven">
            <Input type="number" value={km} onChange={(e) => setKm(e.target.value)} required />
          </FormField>
          <FormField label="Private Full Reg Number (Private)">
            <Input value={car.reg_no_private || ""} disabled className="font-mono bg-ink/5" />
          </FormField>
          <FormField label="Inventory Status">
            <Select value={status} onValueChange={(val) => setStatus(val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available (Public)</SelectItem>
                <SelectItem value="booked">Booked (Deposit Paid)</SelectItem>
                <SelectItem value="sold">Sold & Delivered</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* Inspection JSON Editor */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <Code className="h-4 w-4 text-accent-ink" />
              <span>140-Point Inspection Data (JSON Schema)</span>
            </label>
            <span className="text-[11px] text-ink-mute">Syncs with certified badge</span>
          </div>

          <textarea
            value={inspectionJson}
            onChange={(e) => {
              setInspectionJson(e.target.value);
              setJsonError(null);
            }}
            rows={10}
            className="w-full rounded-lg border border-border p-3 font-mono text-xs text-ink bg-ink/[0.015] focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {jsonError && <p className="text-xs text-danger font-medium">{jsonError}</p>}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            type="submit"
            status={saveStatus}
            loadingText="Saving..."
            successText="Stock Saved!"
            className="gap-2 text-xs"
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Stock Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

