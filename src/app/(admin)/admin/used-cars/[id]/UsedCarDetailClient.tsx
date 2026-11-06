"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PriceSuggestionCard } from "@/components/admin/PriceSuggestionCard";
import { FormField } from "@/components/forms/PhoneField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Save, Code } from "lucide-react";
import { UsedCar } from "@/types/domain";
import { saveUsedCarAction } from "@/server/actions/admin-catalog";

interface UsedCarDetailClientProps {
  car: UsedCar;
}

export function UsedCarDetailClient({ car }: UsedCarDetailClientProps) {
  const [km, setKm] = useState(car.km.toString());
  const [status, setStatus] = useState(car.status);
  const [inspectionJson, setInspectionJson] = useState(
    JSON.stringify(car.inspection_report || {}, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedInspection = JSON.parse(inspectionJson);
      setJsonError(null);

      const res = await saveUsedCarAction({
        id: car.id,
        stock_id: car.stock_id,
        model_name: car.model_name,
        variant_name: car.variant_name,
        fuel: car.fuel,
        year: car.year,
        km: parseInt(km, 10) || car.km,
        owners: car.owners,
        price: car.price,
        status,
        reg_no_private: car.reg_no_masked,
        inspection: parsedInspection,
      });

      if (res.ok) {
        toast.success(`Used car ${car.stock_id} record and inspection updated.`);
      } else {
        toast.error(res.error.message);
      }
    } catch {
      setJsonError("Invalid JSON format in inspection field");
      toast.error("Invalid JSON format in inspection field");
    } finally {
      setIsSaving(false);
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
          <span>Back to Used Inventory</span>
        </Link>
        <span className="text-xs font-mono text-ink-mute">Stock ID: {car.stock_id}</span>
      </div>

      {/* AI Price Suggestion Card (Manager-Only Authority) */}
      <PriceSuggestionCard car={car} />

      {/* Edit Form */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-card space-y-4">
        <h2 className="text-lg font-bold text-ink">Vehicle Docket & Inspection Data</h2>

        <form onSubmit={handleSaveCar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Current Odometer (km)">
              <Input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Inventory Status">
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available for Sale</SelectItem>
                  <SelectItem value="booked">Booked by Buyer</SelectItem>
                  <SelectItem value="sold">Sold & Delivered</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="140-Point Inspection Report (Raw JSON Payload)">
            <div className="space-y-1">
              <textarea
                rows={8}
                value={inspectionJson}
                onChange={(e) => setInspectionJson(e.target.value)}
                className="w-full rounded-md border border-border bg-stone-900 text-stone-100 font-mono text-xs p-3 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {jsonError && <p className="text-[11px] text-danger">{jsonError}</p>}
            </div>
          </FormField>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-ink-mute flex items-center gap-1">
              <Code className="h-3 w-3" />
              <span>Validates JSON structure before persisting</span>
            </span>

            <Button type="submit" size="sm" className="gap-1.5" disabled={isSaving}>
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Used Car Record"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

