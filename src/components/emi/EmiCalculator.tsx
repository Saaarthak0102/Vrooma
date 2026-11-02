"use client";

import React, { useState } from "react";
import { calculateAmortisation } from "@/lib/emi";
import { formatINR } from "@/lib/money";
import { EmiSlider } from "./EmiSlider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface EmiCalculatorProps {
  initialPrice?: number;
  className?: string;
  showAmortisation?: boolean;
}

export function EmiCalculator({
  initialPrice = 1245000,
  className,
  showAmortisation = true,
}: EmiCalculatorProps) {
  const [vehiclePrice, setVehiclePrice] = useState(initialPrice);
  const [downPayment, setDownPayment] = useState(Math.round(initialPrice * 0.2));
  const [annualRate, setAnnualRate] = useState(8.5);
  const [tenureMonths, setTenureMonths] = useState(60);
  const [showTable, setShowTable] = useState(false);

  const loanAmount = Math.max(0, vehiclePrice - downPayment);
  const { monthlyEmi, totalInterest, totalPayment, schedule } = calculateAmortisation(
    loanAmount,
    annualRate,
    tenureMonths
  );

  const principalPct = totalPayment > 0 ? Math.round((loanAmount / totalPayment) * 100) : 0;
  const interestPct = totalPayment > 0 ? 100 - principalPct : 0;

  return (
    <div className={`rounded-xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-8 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sliders Input Column */}
        <div className="lg:col-span-7 space-y-6">
          <EmiSlider
            label="Vehicle Price"
            value={vehiclePrice}
            min={400000}
            max={3000000}
            step={25000}
            formatValue={(v) => formatINR(v)}
            onChange={(v) => {
              setVehiclePrice(v);
              if (downPayment > v) setDownPayment(Math.round(v * 0.2));
            }}
          />

          <EmiSlider
            label="Down Payment"
            value={downPayment}
            min={0}
            max={vehiclePrice * 0.8}
            step={10000}
            formatValue={(v) => formatINR(v)}
            onChange={setDownPayment}
          />

          <EmiSlider
            label="Annual Interest Rate (%)"
            value={annualRate}
            min={6.0}
            max={14.0}
            step={0.25}
            formatValue={(v) => `${v.toFixed(2)}%`}
            onChange={setAnnualRate}
          />

          <EmiSlider
            label="Loan Tenure (Months)"
            value={tenureMonths}
            min={12}
            max={84}
            step={6}
            formatValue={(v) => `${v} Months (${(v / 12).toFixed(1)} Yrs)`}
            onChange={setTenureMonths}
          />
        </div>

        {/* Output & Visual Breakup Column */}
        <div className="lg:col-span-5 rounded-xl bg-ink/[0.02] border border-border p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-mute block">
              Estimated Monthly EMI
            </span>
            <div className="text-3xl sm:text-4xl font-black text-ink mt-1">
              {formatINR(monthlyEmi)}
              <span className="text-xs font-normal text-ink-soft ml-1">/ month</span>
            </div>
          </div>

          {/* Visual Percentage Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-ink/10 overflow-hidden flex">
              <div
                className="bg-dark transition-all duration-300"
                style={{ width: `${principalPct}%` }}
                title={`Principal: ${principalPct}%`}
              />
              <div
                className="bg-accent transition-all duration-300"
                style={{ width: `${interestPct}%` }}
                title={`Interest: ${interestPct}%`}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-ink">
                <span className="h-2.5 w-2.5 rounded-full bg-dark inline-block" />
                Principal ({principalPct}%)
              </span>
              <span className="flex items-center gap-1.5 text-accent-ink font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-accent inline-block" />
                Interest ({interestPct}%)
              </span>
            </div>
          </div>

          {/* Numerical Summary Table */}
          <div className="space-y-2.5 pt-4 border-t border-border text-xs">
            <div className="flex justify-between">
              <span className="text-ink-soft">Loan Amount (P)</span>
              <span className="font-semibold text-ink">{formatINR(loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Total Interest Payable</span>
              <span className="font-semibold text-accent-ink">{formatINR(totalInterest)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-border/60 text-sm">
              <span className="text-ink">Total Loan Repayment</span>
              <span className="text-ink">{formatINR(totalPayment)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Amortisation Table Accordion */}
      {showAmortisation && schedule.length > 0 && (
        <div className="pt-6 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className="w-full justify-between text-xs"
          >
            <span>
              {showTable ? "Hide" : "View"} Detailed Amortisation Schedule ({schedule.length} Months)
            </span>
            {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showTable && (
            <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Month</TableHead>
                    <TableHead className="text-xs">Opening (₹)</TableHead>
                    <TableHead className="text-xs">Principal (₹)</TableHead>
                    <TableHead className="text-xs">Interest (₹)</TableHead>
                    <TableHead className="text-xs">Closing (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((row) => (
                    <TableRow key={row.month} className="text-xs">
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell>{formatINR(row.openingBalance)}</TableCell>
                      <TableCell className="font-semibold text-ink">
                        {formatINR(row.principal)}
                      </TableCell>
                      <TableCell className="text-accent-ink">
                        {formatINR(row.interest)}
                      </TableCell>
                      <TableCell>{formatINR(row.closingBalance)}</TableCell>
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

