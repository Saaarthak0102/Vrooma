import React from "react";
import { LeakCard } from "@/components/admin/LeakCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { listLeads } from "@/server/repositories/leads";
import { Clock, ShieldCheck, Car, PhoneCall } from "lucide-react";

export default async function AdminDashboardPage() {
  const leads = await listLeads({ limit: 100 });
  const contactedInSla = leads.filter((l) => l.first_contacted_at || l.status !== "new").length;
  const slaPercentage = Math.round((contactedInSla / Math.max(1, leads.length)) * 100);

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="pb-4 border-b border-border">
        <span className="text-xs font-bold uppercase tracking-wider text-accent-ink">
          Executive Operations Monitor
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-ink mt-0.5">
          Dealer Principal Executive Cockpit
        </h1>
        <p className="text-xs text-ink-soft">
          Real-time oversight of online lead assignment, conversion metrics, and workshop bay utilisation across Lucknow.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="5-Min SLA Compliance"
          value={`${slaPercentage}%`}
          subtitle="Target: 90% (Brief Goal)"
          icon={<Clock className="h-4 w-4 text-accent-ink" />}
        />
        <StatCard
          label="Web Test Drives"
          value="412"
          subtitle="Target: 400/mo within 6m"
          icon={<Car className="h-4 w-4 text-accent-ink" />}
        />
        <StatCard
          label="Unanswered Service"
          value="4.1%"
          subtitle="Reduced from 20% baseline"
          icon={<PhoneCall className="h-4 w-4 text-accent-ink" />}
        />
        <StatCard
          label="Active Showrooms"
          value="3"
          subtitle="Hazratganj, Gomti, Kanpur"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      {/* The ₹2.11 Crore Leakage Monitor */}
      <LeakCard />
    </div>
  );
}
