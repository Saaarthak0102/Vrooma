"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { LeadTable } from "@/components/staff/LeadTable";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { Clock, AlertTriangle, CheckCircle2, Calendar, Plus, Inbox } from "lucide-react";

export default function StaffOverviewPage() {
  const { user } = useAuth();
  const leads = memoryStore.leads;

  const urgentLeads = leads.filter((l) => l.status === "new");
  const breachedLeads = leads.filter(
    (l) => l.status === "new" && new Date(l.sla_due_at).getTime() < Date.now()
  );
  const contactedLeads = leads.filter((l) => l.status !== "new");

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent-ink">
            Sales Consultant Desk
          </span>
          <h1 className="text-2xl font-black text-ink mt-0.5">
            SLA Response Dashboard
          </h1>
          <p className="text-xs text-ink-soft">
            5-Minute response SLA enforced across Hazratganj, Gomti Nagar & Kanpur.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href="/staff/leads/import">Import CSV Leads</Link>
          </Button>
          <Button asChild size="sm" variant="primary" className="text-xs">
            <Link href="/staff/leads">Open Lead Inbox</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Urgent Inquiries"
          value={urgentLeads.length}
          subtitle="Action required (< 5m)"
          icon={<Clock className="h-4 w-4 text-warn" />}
        />
        <StatCard
          label="SLA Breached"
          value={breachedLeads.length}
          subtitle="Exceeded 5 minutes"
          icon={<AlertTriangle className="h-4 w-4 text-danger" />}
        />
        <StatCard
          label="Contacted (SLA Met)"
          value={contactedLeads.length}
          subtitle="First reply logged"
          icon={<CheckCircle2 className="h-4 w-4 text-accent-ink" />}
        />
        <StatCard
          label="Today's Demos"
          value={memoryStore.bookings.length}
          subtitle="Scheduled test drives"
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Priority Inbound Leads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Inbox className="h-4 w-4 text-accent-ink" />
            <span>Priority Inbound Leads Requiring Response</span>
          </h3>
          <Link
            href="/staff/leads"
            className="text-xs font-semibold text-accent-ink hover:underline"
          >
            View full queue ({leads.length})
          </Link>
        </div>

        <LeadTable leads={leads.slice(0, 4)} />
      </div>
    </div>
  );
}
