"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/forms/PhoneField";
import { savePriceRuleAction } from "@/server/actions/admin-catalog";
import { priceRuleSchema } from "@/lib/validation/price-rule";
import { LUCKNOW_CITY_ID, KANPUR_CITY_ID } from "@/lib/cities";
import type { PriceRule } from "@/types/domain";

export interface PriceRuleModelOption {
  id: string;
  name: string;
  variants: { id: string; name: string; fuel: string }[];
}

export interface PriceRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this rule; otherwise it creates a new one. */
  rule?: PriceRule | null;
  models: PriceRuleModelOption[];
}

const ANY = "__any__";

const CITIES = [
  { id: LUCKNOW_CITY_ID, name: "Lucknow" },
  { id: KANPUR_CITY_ID, name: "Kanpur" },
];

const FUELS = ["petrol", "diesel", "cng", "ev", "hybrid"];

interface FormState {
  city_id: string;
  model_id: string;
  variant_id: string;
  fuel: string;
  road_tax_pct: string;
  registration: string;
  insurance: string;
  handling: string;
  accessories: string;
  tcs_pct: string;
  valid_from: string;
  valid_until: string;
  notes: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function endOfYear(): string {
  return `${new Date().getFullYear()}-12-31`;
}

function initialState(rule?: PriceRule | null): FormState {
  return {
    city_id: rule?.city_id ?? LUCKNOW_CITY_ID,
    model_id: rule?.model_id ?? ANY,
    variant_id: rule?.variant_id ?? ANY,
    fuel: rule?.fuel ?? ANY,
    road_tax_pct: String(rule?.road_tax_pct ?? 10),
    registration: String(rule?.registration ?? 0),
    insurance: String(rule?.insurance ?? 0),
    handling: String(rule?.handling ?? 0),
    accessories: String(rule?.accessories ?? 0),
    tcs_pct: String(rule?.tcs_pct ?? 1),
    valid_from: rule?.valid_from ?? today(),
    valid_until: rule?.valid_until ?? endOfYear(),
    notes: rule?.notes ?? "",
  };
}

/**
 * Create or edit an on-road price rule. Every field maps 1:1 to price_rules, and the server action
 * re-validates with the same zod schema, so the admin table stays the only source of on-road prices.
 */
export function PriceRuleDialog({ open, onOpenChange, rule, models }: PriceRuleDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(rule));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form each time the dialog opens (or switches between rules).
  useEffect(() => {
    if (open) {
      setForm(initialState(rule));
      setError(null);
    }
  }, [open, rule]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const variants = useMemo(
    () => models.find((m) => m.id === form.model_id)?.variants ?? [],
    [models, form.model_id]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      city_id: form.city_id,
      model_id: form.model_id === ANY ? null : form.model_id,
      variant_id: form.variant_id === ANY ? null : form.variant_id,
      fuel: form.fuel === ANY ? null : form.fuel,
      road_tax_pct: form.road_tax_pct,
      registration: form.registration,
      insurance: form.insurance,
      handling: form.handling,
      accessories: form.accessories,
      tcs_pct: form.tcs_pct,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      notes: form.notes.trim() || null,
    };

    const parsed = priceRuleSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Please check the values.");
      return;
    }

    setSaving(true);
    try {
      const res = await savePriceRuleAction({
        ...parsed.data,
        tcs_pct: parsed.data.tcs_pct ?? 1,
        id: rule?.id,
      });
      if (!res.ok) {
        setError(res.error?.message ?? "Could not save the price rule.");
        return;
      }
      toast.success(rule ? "Price rule updated." : "Price rule created.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const money = (key: "registration" | "insurance" | "handling" | "accessories", label: string) => (
    <FormField label={`${label} (₹)`}>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className="h-11 text-sm"
      />
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {rule ? "Edit price rule" : "New price rule"}
          </DialogTitle>
          <DialogDescription>
            Buyers see on-road prices calculated from this table. Rules for the same city and scope cannot overlap
            in time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="City">
              <Select value={form.city_id} onValueChange={(v) => set("city_id", v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Fuel (optional)">
              <Select value={form.fuel} onValueChange={(v) => set("fuel", v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All fuels</SelectItem>
                  {FUELS.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Model (optional)">
              <Select
                value={form.model_id}
                onValueChange={(v) => {
                  set("model_id", v);
                  set("variant_id", ANY);
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All models (city-wide)</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Variant (optional)">
              <Select
                value={form.variant_id}
                onValueChange={(v) => set("variant_id", v)}
                disabled={form.model_id === ANY}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All variants</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FormField label="Road tax (%)">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={30}
                step="0.1"
                value={form.road_tax_pct}
                onChange={(e) => set("road_tax_pct", e.target.value)}
                className="h-11 text-sm"
              />
            </FormField>
            <FormField label="TCS (%)">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={5}
                step="0.1"
                value={form.tcs_pct}
                onChange={(e) => set("tcs_pct", e.target.value)}
                className="h-11 text-sm"
              />
            </FormField>
            {money("registration", "Registration")}
            {money("insurance", "Insurance")}
            {money("handling", "Handling")}
            {money("accessories", "Accessories")}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Valid from">
              <Input
                type="date"
                value={form.valid_from}
                onChange={(e) => set("valid_from", e.target.value)}
                className="h-11 text-sm"
              />
            </FormField>
            <FormField label="Valid until">
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) => set("valid_until", e.target.value)}
                className="h-11 text-sm"
              />
            </FormField>
          </div>

          <FormField label="Internal note (optional)">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={500}
              className="min-h-[64px] text-xs"
              placeholder="e.g. Festive accessory kit included until 30 Nov"
            />
          </FormField>

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
              {saving ? "Saving…" : rule ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
