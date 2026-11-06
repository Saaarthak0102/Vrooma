import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { TradeInForm } from "@/components/forms/TradeInForm";
import { constructMetadata } from "@/lib/seo";
import { ShieldCheck, Sparkles, RefreshCw } from "lucide-react";

export async function generateMetadata() {
  return constructMetadata({
    title: "Car Trade-In & Exchange Value Calculator - Lucknow",
    description: "Get an instant AI-powered exchange valuation for your existing car towards any new Brand X or certified used car at Vrooma.",
    path: "/trade-in",
  });
}

export default function TradeInPage() {
  return (
    <PageShell
      title="Trade-In & Vehicle Exchange Valuation"
      subtitle="Upgrade to a new Brand X or certified pre-owned car. Receive an instant transparent market valuation based on Lucknow historical sales."
      breadcrumbs={[{ label: "Trade-In" }]}
    >
      <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <span className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink shrink-0">
            <RefreshCw className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">Exchange Your Existing Car</h2>
            <p className="text-xs text-ink-soft">
              Instant valuation with zero commitment · Verified Lucknow dealer evaluation
            </p>
          </div>
        </div>

        <TradeInForm />
      </div>
    </PageShell>
  );
}

