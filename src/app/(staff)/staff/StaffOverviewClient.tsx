"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { LeadTable } from "@/components/staff/LeadTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { Lead } from "@/types/domain";

interface StaffOverviewClientProps {
  initialLeads: Lead[];
  totalBookings: number;
}

export function StaffOverviewClient({ initialLeads, totalBookings }: StaffOverviewClientProps) {
  const { user } = useAuth();
  const leads = initialLeads;

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
          subtitle="Awaiting first call"
          icon={<Clock className="h-4 w-4 text-warning" />}
        />
        <StatCard
          label="SLA Breached"
          value={breachedLeads.length}
          subtitle="> 5 mins without call"
          icon={<AlertTriangle className="h-4 w-4 text-danger" />}
        />
        <StatCard
          label="Engaged Today"
          value={contactedLeads.length}
          subtitle="Calls logged"
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        />
        <StatCard
          label="Upcoming Demos"
          value={totalBookings}
          subtitle="Test drives fixed"
          icon={<Calendar className="h-4 w-4 text-accent-ink" />}
        />
      </div>

      {/* Immediate Attention Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Action Required: Pending Leads
            </h3>
            <p className="text-xs text-ink-soft">
              Prioritised by remaining SLA time window. Pick up immediately.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/staff/leads">View All ({leads.length})</Link>
          </Button>
        </div>

        <LeadTable leads={urgentLeads.slice(0, 10)} />
      </div>
    </div>
  );
}

