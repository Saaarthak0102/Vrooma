import React from "react";
import { Input, InputProps } from "@/components/ui/input";

export interface PhoneFieldProps extends Omit<InputProps, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  label?: string;
}

export function PhoneField({
  value,
  onChange,
  error,
  label = "Mobile Number",
  ...props
}: PhoneFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Digits only, max 10
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange(digits);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
          {label}
        </label>
      )}
      <div className="relative flex rounded-md">
        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-ink/5 text-ink-soft text-xs font-semibold select-none">
          +91
        </span>
        <Input
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder="98765 43210"
          className="rounded-l-none font-mono"
          maxLength={10}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}
