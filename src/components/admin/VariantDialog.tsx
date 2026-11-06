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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/forms/PhoneField";
import { saveVariantAction } from "@/server/actions/admin-catalog";
import type { AdminVariant } from "@/server/repositories/admin-models";

const FUELS = ["petrol", "diesel", "cng", "ev", "hybrid"];

function specsToText(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function textToSpecs(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) specs[key] = value;
  }
  return specs;
}

export interface VariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  modelName: string;
  /** When set, edits this variant; otherwise creates one. */
  variant?: AdminVariant | null;
}

export function VariantDialog({ open, onOpenChange, modelId, modelName, variant }: VariantDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fuel, setFuel] = useState("petrol");
  const [transmission, setTransmission] = useState("manual");
  const [exShowroom, setExShowroom] = useState("");
  const [features, setFeatures] = useState("");
  const [specs, setSpecs] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(variant?.name ?? "");
    setFuel(variant?.fuel ?? "petrol");
    setTransmission(variant?.transmission ?? "manual");
    setExShowroom(variant ? String(variant.ex_showroom) : "");
    setFeatures((variant?.features ?? []).join("\n"));
    setSpecs(specsToText(variant?.specs ?? {}));
    setIsActive(variant?.is_active ?? true);
    setError(null);
  }, [open, variant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = Number(exShowroom);
    if (!Number.isInteger(price) || price <= 0) {
      setError("Ex-showroom price must be a whole number of rupees greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveVariantAction({
        id: variant?.id,
        model_id: modelId,
        name,
        fuel,
        transmission,
        ex_showroom: price,
        specs: textToSpecs(specs),
        features: features.split("\n"),
        is_active: isActive,
      });
      if (!res.ok) {
        setError(res.error?.message ?? "Could not save the variant.");
        return;
      }
      toast.success(variant ? "Variant updated." : "Variant added.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {variant ? `Edit ${variant.name}` : `Add variant to ${modelName}`}
          </DialogTitle>
          <DialogDescription>
            The ex-showroom price is the base for every on-road quote. City taxes and fees come from the price rules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Variant name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className="h-11" />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Fuel" required>
              <Select value={fuel} onValueChange={setFuel}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUELS.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Transmission" required>
              <Select value={transmission} onValueChange={setTransmission}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Ex-showroom (₹)" required>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={exShowroom}
                onChange={(e) => setExShowroom(e.target.value)}
                required
                className="h-11"
              />
            </FormField>
          </div>

          <FormField label="Key specs (one per line, Label: value)">
            <Textarea
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              className="min-h-[88px] font-mono text-xs"
              placeholder={"Engine: 1.5L i-VTEC\nPower: 121 PS"}
            />
          </FormField>

          <FormField label="Features (one per line)">
            <Textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="min-h-[88px] text-xs"
              placeholder={"Sunroof\n6 airbags"}
            />
          </FormField>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Variant is live" />
            <span className="text-xs font-semibold">{isActive ? "Live on the website" : "Hidden from the website"}</span>
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
              {saving ? "Saving…" : variant ? "Save changes" : "Add variant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
