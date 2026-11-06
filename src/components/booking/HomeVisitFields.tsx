"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/PhoneField";
import type { HomeVisitErrors } from "@/lib/validation/home-visit";

interface HomeVisitFieldsProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  address: string;
  onAddressChange: (value: string) => void;
  pincode: string;
  onPincodeChange: (value: string) => void;
  errors?: HomeVisitErrors;
  /** Checkbox label, e.g. "Bring the test drive car to my address". */
  label: string;
  description: string;
}

/** Optional "come to my address" block shared by the test drive and service booking forms. */
export function HomeVisitFields({
  enabled,
  onEnabledChange,
  address,
  onAddressChange,
  pincode,
  onPincodeChange,
  errors,
  label,
  description,
}: HomeVisitFieldsProps) {
  return (
    <div className="rounded-xl border border-border bg-stone-50/70 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="home-visit"
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
          className="mt-0.5"
        />
        <label htmlFor="home-visit" className="cursor-pointer select-none">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="block text-xs text-ink-soft mt-0.5">{description}</span>
        </label>
      </div>

      {enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in">
          <div className="sm:col-span-2">
            <FormField label="Full address" required error={errors?.address}>
              <Textarea
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="House / flat no., street, area, landmark"
                rows={2}
                maxLength={255}
                className="bg-white text-sm resize-y"
              />
            </FormField>
          </div>
          <FormField label="PIN code" required error={errors?.pincode}>
            <Input
              inputMode="numeric"
              value={pincode}
              onChange={(e) => onPincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="226001"
              maxLength={6}
              className="bg-white font-mono text-sm"
            />
          </FormField>
        </div>
      )}

      <p className="text-[11px] text-ink-mute">
        Your address is used only for this booking and is not saved to your profile.
      </p>
    </div>
  );
}
