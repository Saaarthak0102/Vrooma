import React from "react";
import { TrendingDown, AlertTriangle } from "lucide-react";

export interface LeakCardProps {
  /** Window the live numbers cover, in days. */
  windowDays: number;
  /** Share of leads first contacted within their SLA, 0-100. Null when there are no leads in the window. */
  slaPct: number | null;
  totalLeads: number;
  contactedInSla: number;
  lostLeads: number;
  /** Online service bookings in the window (the measurable side of "unanswered service calls"). */
  serviceBookings: number;
}

/**
 * The brief's ₹2.11 crore leakage story. The arithmetic below is the documented BASELINE from the brief
 * (4,500 leads, 30% delayed, 2% vs 6% conversion ...). The "now" rows are measured from the database.
 */
export function LeakCard({ windowDays, slaPct, totalLeads, contactedInSla, lostLeads, serviceBookings }: LeakCardProps) {
  const slaOnTarget = slaPct !== null && slaPct >= 90;

  return (
    <div className="space-y-5 rounded-2xl border border-danger/30 bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-danger">
            <AlertTriangle className="h-4 w-4" />
            <span>Revenue leakage</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-ink sm:text-3xl">₹2.11 crore a year at stake</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-soft">
            Baseline from the brief: delayed lead calls and unanswered service calls. The figures marked &ldquo;now&rdquo;
            are measured from live data over the last {windowDays} days.
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-danger/20 bg-danger/10 p-4 text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-danger">Baseline loss</span>
          <span className="text-2xl font-black text-danger sm:text-3xl">₹2.11 Cr</span>
          <span className="block text-[10px] text-danger/80">₹17.55 lakh / month</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-ink/[0.02] p-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <TrendingDown className="h-4 w-4 text-danger" />
              1. Delayed lead response
            </h3>
            <span className="font-bold text-danger">₹1.62 Cr / yr</span>
          </div>
          <ul className="space-y-1 rounded-lg border border-border/60 bg-surface p-3 text-ink-soft">
            <li>4,500 online leads a month; 30% (1,350) not called within 24 hours</li>
            <li>They convert at 2% instead of 6%: 1,350 × 4% = <strong>54 cars lost a month</strong></li>
            <li>54 × ₹25,000 = <strong>₹13.5 lakh a month</strong></li>
          </ul>
          <div
            className={`flex items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold ${
              slaPct === null ? "bg-ink/5 text-ink-soft" : slaOnTarget ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            }`}
          >
            <span>Now: leads answered within 5 minutes</span>
            <span>
              {slaPct === null ? "No leads yet" : `${slaPct}% (${contactedInSla} of ${totalLeads}) · target 90%`}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-ink/5 px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
            <span>Now: leads lost</span>
            <span>{lostLeads}</span>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-ink/[0.02] p-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <TrendingDown className="h-4 w-4 text-danger" />
              2. Unanswered service calls
            </h3>
            <span className="font-bold text-danger">₹48.6 lakh / yr</span>
          </div>
          <ul className="space-y-1 rounded-lg border border-border/60 bg-surface p-3 text-ink-soft">
            <li>3,000 service calls a month; 20% (600) go unanswered</li>
            <li>Half of those owners (300) go elsewhere</li>
            <li>300 × ₹4,500 × 30% margin = <strong>₹4.05 lakh a month</strong></li>
          </ul>
          <div className="flex items-center justify-between rounded-md bg-ink/5 px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
            <span>Now: service bookings made online</span>
            <span>{serviceBookings}</span>
          </div>
          <p className="text-[11px] text-ink-mute">
            Phone calls are not tracked in this system, so the unanswered-call rate itself cannot be measured here.
            Online bookings are the calls that no longer depend on someone picking up.
          </p>
        </section>
      </div>
    </div>
  );
}
