import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { EmiCalculator } from "@/components/emi/EmiCalculator";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return constructMetadata({
    title: "Car Loan EMI Calculator Lucknow - Real Interest & Amortisation",
    description: "Calculate monthly car loan installments, compare down payments, and inspect complete year-wise amortisation schedules for Brand X vehicles in Lucknow.",
    path: "/emi-calculator",
  });
}

export default function EmiCalculatorPage() {
  return (
    <PageShell
      title="Car Finance & Monthly EMI Calculator"
      subtitle="Plan your purchase with real interest rates, customizable down payments, and month-by-month amortisation schedules."
      breadcrumbs={[{ label: "EMI Calculator" }]}
    >
      <div className="max-w-4xl mx-auto">
        <EmiCalculator initialPrice={1245000} showAmortisation={true} />
      </div>
    </PageShell>
  );
}
