"use client";

import React, { useState } from "react";
import { calculateAmortisation } from "@/lib/emi";
import { formatINR } from "@/lib/money";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Calculator, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelEmiCalculatorProps {
  variantPrice: number;
  variantName: string;
  modelName: string;
  className?: string;
}

const TENURE_OPTIONS = [12, 24, 36, 48, 60, 72, 84];

export function ModelEmiCalculator({
  variantPrice,
  variantName,
  modelName,
  className,
}: ModelEmiCalculatorProps) {
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [annualRate, setAnnualRate] = useState(8.5);
  const [tenureMonths, setTenureMonths] = useState(60);
  const [showSchedule, setShowSchedule] = useState(false);

  // Computed financial figures
  const downPaymentAmount = Math.round(variantPrice * (downPaymentPct / 100));
  const principal = Math.max(0, variantPrice - downPaymentAmount);

  const { monthlyEmi, totalInterest, totalPayment, schedule } = calculateAmortisation(
    principal,
    annualRate,
    tenureMonths
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-white p-5 sm:p-6 shadow-sm text-left flex flex-col justify-between space-y-3",
        className
      )}
    >
      {/* 1. Header & Financed Vehicle Price */}
      <div className="pb-2.5 border-b border-border/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Calculator className="h-3.5 w-3.5" />
            </div>
            <h4 className="text-base font-bold text-ink">EMI Calculator</h4>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-600/20 px-2 py-0.5 rounded-full">
            Ex-Showroom Basis
          </span>
        </div>
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-ink-mute truncate">
            {modelName} · {variantName}
          </span>
          <span className="text-ink font-semibold ml-2 shrink-0">
            Financed Price: <strong className="font-black text-ink">{formatINR(variantPrice)}</strong>
          </span>
        </div>
      </div>

      {/* 2. Down Payment Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink-soft">
            Down Payment ({downPaymentPct}%)
          </span>
          <span className="font-extrabold text-ink">{formatINR(downPaymentAmount)}</span>
        </div>
        <Slider
          min={10}
          max={50}
          step={1}
          value={[downPaymentPct]}
          onValueChange={(val) => setDownPaymentPct(val[0])}
          aria-label="Down payment percentage"
          className="py-0.5"
        />
        <div className="flex items-center justify-between text-[10px] text-ink-mute">
          <span>Min 10% ({formatINR(Math.round(variantPrice * 0.1))})</span>
          <span>Max 50% ({formatINR(Math.round(variantPrice * 0.5))})</span>
        </div>
      </div>

      {/* 3. Loan Principal Display */}
      <div className="flex items-center justify-between py-1 px-2.5 rounded-md bg-stone-50 border border-border/50 text-xs">
        <span className="text-ink-soft font-medium text-[11px]">Loan Principal (Amount Financed)</span>
        <span className="font-bold text-ink">{formatINR(principal)}</span>
      </div>

      {/* 4. Annual Interest Rate Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink-soft">
            Annual Interest Rate
          </span>
          <span className="font-extrabold text-ink">{annualRate.toFixed(2)}% p.a.</span>
        </div>
        <Slider
          min={6.0}
          max={15.0}
          step={0.25}
          value={[annualRate]}
          onValueChange={(val) => setAnnualRate(val[0])}
          aria-label="Annual interest rate"
          className="py-0.5"
        />
        <div className="flex items-center justify-between text-[10px] text-ink-mute">
          <span>6.0%</span>
          <span>Default 8.5%</span>
          <span>15.0%</span>
        </div>
      </div>

      {/* 5. Loan Tenure Selector */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink-soft">Loan Tenure</span>
          <span className="font-bold text-ink">{tenureMonths} Months ({tenureMonths / 12} Yrs)</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {TENURE_OPTIONS.map((months) => {
            const isSelected = months === tenureMonths;
            return (
              <button
                key={months}
                type="button"
                onClick={() => setTenureMonths(months)}
                className={cn(
                  "py-1 px-0.5 text-center text-xs font-bold rounded-md border transition-all duration-150 outline-none",
                  isSelected
                    ? "bg-dark text-white border-dark shadow-xs"
                    : "bg-white text-ink border-border hover:bg-stone-50"
                )}
              >
                {months}m
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Primary Result: Estimated Monthly EMI */}
      <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-600/20 rounded-xl">
        <div>
          <span className="text-[11px] uppercase font-extrabold tracking-wider text-ink block">
            Estimated Monthly EMI
          </span>
          <span className="text-[10px] text-ink-soft block mt-0.5">
            {downPaymentPct}% down · {annualRate.toFixed(1)}% p.a. · {tenureMonths} mo
          </span>
        </div>
        <div className="text-right">
          <span className="text-xl sm:text-2xl font-black text-ink tracking-tight block">
            {formatINR(monthlyEmi)}
          </span>
          <span className="text-[10px] font-medium text-ink-mute block -mt-0.5">/ month</span>
        </div>
      </div>

      {/* 7. Financial Summary */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1.5 border-t border-border/60 text-[11px]">
        <div className="flex items-center justify-between py-0.5 border-b border-border/30">
          <span className="text-ink-soft">Ex-Showroom</span>
          <span className="font-semibold text-ink">{formatINR(variantPrice)}</span>
        </div>
        <div className="flex items-center justify-between py-0.5 border-b border-border/30">
          <span className="text-ink-soft">Down Payment</span>
          <span className="font-semibold text-ink">{formatINR(downPaymentAmount)}</span>
        </div>
        <div className="flex items-center justify-between py-0.5 border-b border-border/30">
          <span className="text-ink-soft">Total Interest</span>
          <span className="font-semibold text-emerald-800">{formatINR(totalInterest)}</span>
        </div>
        <div className="flex items-center justify-between py-0.5 border-b border-border/30 font-bold">
          <span className="text-ink">Total Repayment</span>
          <span className="text-ink">{formatINR(totalPayment)}</span>
        </div>
      </div>

      {/* 8. Expandable Repayment Schedule */}
      {schedule.length > 0 && (
        <div className="pt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSchedule(!showSchedule)}
            className="w-full justify-between text-xs h-7 px-1.5 text-ink-soft hover:text-ink hover:bg-stone-50"
          >
            <span className="flex items-center gap-1.5 font-medium text-[11px]">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              {showSchedule ? "Hide Amortisation Schedule" : "View Amortisation Schedule"} ({schedule.length} Mo)
            </span>
            {showSchedule ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          {showSchedule && (
            <div className="mt-2.5 max-h-56 overflow-y-auto rounded-xl border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50 text-[11px]">
                    <TableHead className="py-1.5 px-2 font-bold">Month</TableHead>
                    <TableHead className="py-1.5 px-2 font-bold">Opening</TableHead>
                    <TableHead className="py-1.5 px-2 font-bold">Principal</TableHead>
                    <TableHead className="py-1.5 px-2 font-bold">Interest</TableHead>
                    <TableHead className="py-1.5 px-2 font-bold">Closing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((row) => (
                    <TableRow key={row.month} className="text-[11px]">
                      <TableCell className="py-1.5 px-2 font-medium">{row.month}</TableCell>
                      <TableCell className="py-1.5 px-2">{formatINR(row.openingBalance)}</TableCell>
                      <TableCell className="py-1.5 px-2 font-semibold text-ink">
                        {formatINR(row.principal)}
                      </TableCell>
                      <TableCell className="py-1.5 px-2 text-emerald-800">
                        {formatINR(row.interest)}
                      </TableCell>
                      <TableCell className="py-1.5 px-2">{formatINR(row.closingBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
