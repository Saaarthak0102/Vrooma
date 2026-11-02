import React from "react";
import { maskRegNo } from "@/lib/masking";
import { ShieldCheck } from "lucide-react";

export interface MaskedRegProps {
  regNo?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function MaskedReg({ regNo, className, showIcon = true }: MaskedRegProps) {
  const masked = maskRegNo(regNo);

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs font-semibold text-ink-soft bg-ink/5 px-2 py-0.5 rounded-sm ${className}`}
      title="Registration number masked for privacy under DPDP Act 2023"
    >
      {showIcon && <ShieldCheck className="h-3.5 w-3.5 text-accent-ink" />}
      <span>{masked}</span>
    </span>
  );
}
