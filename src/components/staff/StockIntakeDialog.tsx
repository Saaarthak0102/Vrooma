"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/PhoneField";
import { saveUsedCarAction } from "@/server/actions/admin-catalog";

const FUELS = ["petrol", "diesel", "cng", "ev", "hybrid"];
const EMPTY = {
  stock_id: "",
  model_name: "",
  variant_name: "",
  fuel: "petrol",
  year: String(new Date().getFullYear() - 3),
  km: "",
  owners: "1",
  price: "",
  reg_no_private: "",
};

/** Vehicle intake: adds a car to certified stock. The full plate is stored privately and shown masked everywhere. */
export function StockIntakeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setError(null);
    }
  }, [open]);

  const set = (key: keyof typeof EMPTY, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await saveUsedCarAction({
        stock_id: form.stock_id.trim().toUpperCase(),
        model_name: form.model_name.trim(),
        variant_name: form.variant_name.trim(),
        fuel: form.fuel,
        year: Number(form.year),
        km: Number(form.km),
        owners: Number(form.owners),
        price: Number(form.price),
        reg_no_private: form.reg_no_private.trim().toUpperCase(),
        status: "available",
      });
      if (!res.ok) {
        setError(res.error?.message ?? "Could not add the vehicle.");
        return;
      }
      toast.success(`${form.stock_id.toUpperCase()} added to stock. Score its inspection next.`);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <FormField label={label} required>
      <Input value={form[key]} onChange={(e) => set(key, e.target.value)} required className="h-11" {...props} />
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Add vehicle to stock</DialogTitle>
          <DialogDescription>
            New stock appears on the public used-cars page once saved. Buyers only ever see the masked plate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("stock_id", "Stock ID", { placeholder: "UC-1201", pattern: "[A-Za-z0-9-]{3,20}" })}
            {field("reg_no_private", "Registration number", { placeholder: "UP32AB1234" })}
            {field("model_name", "Model", { placeholder: "Model C" })}
            {field("variant_name", "Variant", { placeholder: "VX" })}
            <FormField label="Fuel" required>
              <select
                value={form.fuel}
                onChange={(e) => set("fuel", e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm capitalize"
              >
                {FUELS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </FormField>
            {field("year", "Year", { type: "number", inputMode: "numeric" })}
            {field("km", "Kilometres", { type: "number", inputMode: "numeric", min: 0 })}
            {field("owners", "Owners", { type: "number", inputMode: "numeric", min: 1, max: 10 })}
            {field("price", "Listing price (₹)", { type: "number", inputMode: "numeric", min: 1 })}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Adding…" : "Add to stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
