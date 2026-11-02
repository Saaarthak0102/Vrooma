"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface ConsentCheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
  className?: string;
}

export function ConsentCheckbox({
  id = "dpdp-consent",
  checked,
  onCheckedChange,
  error,
  className,
}: ConsentCheckboxProps) {
  const tCommon = useTranslations("common");

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-start gap-2.5">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(c) => onCheckedChange(!!c)}
          className="mt-0.5"
        />
        <label
          htmlFor={id}
          className="text-xs text-ink-soft leading-relaxed cursor-pointer select-none"
        >
          {tCommon("privacyConsent")}{" "}
          <Link
            href="/legal/privacy"
            className="text-accent-ink hover:underline font-medium inline-flex items-center gap-0.5"
            target="_blank"
          >
            <ShieldCheck className="h-3 w-3" />
            DPDP Notice
          </Link>
        </label>
      </div>
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}

