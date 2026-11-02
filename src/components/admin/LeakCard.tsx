import React from "react";
import { formatLakh, formatINR } from "@/lib/money";
import { TrendingDown, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

export function LeakCard() {
  return (
    <div className="rounded-2xl border border-danger/30 bg-white p-6 sm:p-8 shadow-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-danger font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4" />
            <span>Dealer Principal Financial Leakage Metric</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-ink mt-1">
            ₹2.11 Crore Annual Revenue Leak Monitor
          </h2>
          <p className="text-xs text-ink-soft max-w-xl mt-1 leading-relaxed">
            Historical baseline: 30% of online leads delayed &gt; 24h + 20% unanswered service calls cost Lucknow dealerships ₹17.55 lakh every single month.
          </p>
        </div>

        <div className="rounded-xl bg-danger/10 border border-danger/20 p-4 text-center shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-danger block">
            Annual Losses (Baseline)
          </span>
          <span className="text-2xl sm:text-3xl font-black text-danger">₹2.11 Cr</span>
          <span className="text-[10px] text-danger/80 block mt-0.5">₹17.55 Lakh / month</span>
        </div>
      </div>

      {/* Two Pillars: Sales Leads Leak vs Service Calls Leak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Lead Leakage */}
        <div className="rounded-xl bg-ink/[0.02] border border-border p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-ink flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-danger" />
              1. Delayed Sales Lead Response Leak
            </h4>
            <span className="font-bold text-danger">₹1.62 Cr / yr</span>
          </div>
          <div className="space-y-1.5 text-ink-soft bg-white p-3 rounded-lg border border-border/60">
            <p>• 4,500 monthly online leads across portals & web</p>
            <p>• 30% (1,350 leads) delayed &gt; 24 hrs → conversion drops from 6% to 2%</p>
            <p>• 1,350 × 4% delta = <strong>54 cars lost / month</strong></p>
            <p>• 54 cars × ₹25,000 dealer margin = <strong>₹13.5 Lakh / month (₹1.62 Cr/yr)</strong></p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-accent-ink bg-accent/10 px-3 py-1.5 rounded-md">
            <span>5-Min Lead SLA Current Recovery:</span>
            <span>92.4% on track</span>
          </div>
        </div>

        {/* Unanswered Service Calls Leak */}
        <div className="rounded-xl bg-ink/[0.02] border border-border p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-ink flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-danger" />
              2. Unanswered Service Booking Leak
            </h4>
            <span className="font-bold text-danger">₹48.6 Lakh / yr</span>
          </div>
          <div className="space-y-1.5 text-ink-soft bg-white p-3 rounded-lg border border-border/60">
            <p>• 3,000 service calls received monthly</p>
            <p>• 20% (600 calls) go unanswered during peak workshop rush</p>
            <p>• 50% (300 owners) migrate to third-party independent garages</p>
            <p>• 300 × ₹4,500 average repair bill × 30% margin = <strong>₹4.05 Lakh / month (₹48.6 Lakh/yr)</strong></p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-accent-ink bg-accent/10 px-3 py-1.5 rounded-md">
            <span>Online Bay Booking Conversion:</span>
            <span>Unanswered &lt; 4.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
