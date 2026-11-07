import React from "react";
import { Car, Clock, PhoneCall, Users } from "lucide-react";
import { requireRole } from "@/server/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLeakMetricsAction } from "@/server/actions/admin-leak";
import { getCallMetricsAction } from "@/server/actions/calls";
import { LeakCard } from "@/components/admin/LeakCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { TabLinks, pickTab, type TabLinkItem } from "@/components/layout/TabLinks";
import { AiLogsPanel } from "@/components/admin/overview/AiLogsPanel";
import { SystemPanel } from "@/components/admin/overview/SystemPanel";
import { PerformanceOverview } from "@/components/admin/overview/PerformanceOverview";
import { loadOverviewData } from "@/server/repositories/admin-overview";

export const dynamic = "force-dynamic";

const TABS: TabLinkItem[] = [
  { id: "overview", label: "Overview" },
  { id: "ai", label: "AI reply log" },
  { id: "system", label: "System health" },
];

const WINDOW_DAYS = 30;

/** Screen 1 for the Dealer Principal: live performance against the brief's three success metrics. */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireRole("admin");
  const tab = pickTab((await searchParams).tab, TABS);

  let body: React.ReactNode;

  if (tab === "ai") {
    body = <AiLogsPanel />;
  } else if (tab === "system") {
    body = <SystemPanel />;
  } else {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const admin = createAdminClient();

    const [metrics, callMetrics, testDrives, services, activeStaff, overview] = await Promise.all([
      getLeakMetricsAction(since),
      getCallMetricsAction(WINDOW_DAYS),
      admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("kind", "test_drive")
        .neq("status", "cancelled")
        .gte("created_at", since),
      admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("kind", "service")
        .neq("status", "cancelled")
        .gte("created_at", since),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "consultant").eq("is_active", true),
      // Charts are a convenience: if they fail to load the KPIs and the leak card still render.
      loadOverviewData().catch((err) => {
        console.warn("[admin] overview charts unavailable:", (err as Error)?.message);
        return null;
      }),
    ]);

    const m = metrics.ok ? metrics.data : null;
    const slaPct = m && m.totalLeads > 0 ? Math.round(m.slaCompliancePct) : null;

    body = (
      <div className="space-y-5">
        {!metrics.ok && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            Live lead metrics could not be loaded: {metrics.error?.message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Answered in 5 min"
            value={slaPct === null ? "–" : `${slaPct}%`}
            subtitle={`Target 90% · last ${WINDOW_DAYS} days`}
            icon={<Clock className="h-4 w-4 text-accent-ink" />}
          />
          <StatCard
            label="Online test drives"
            value={testDrives.count ?? 0}
            subtitle={`Target 400 a month · last ${WINDOW_DAYS} days`}
            icon={<Car className="h-4 w-4 text-accent-ink" />}
          />
          <StatCard
            label="Online service bookings"
            value={services.count ?? 0}
            subtitle={`Last ${WINDOW_DAYS} days`}
            icon={<PhoneCall className="h-4 w-4 text-accent-ink" />}
          />
          <StatCard
            label="Active consultants"
            value={activeStaff.count ?? 0}
            subtitle="Receiving routed leads"
            icon={<Users className="h-4 w-4 text-accent-ink" />}
          />
        </div>

        {overview && <PerformanceOverview leads={overview.leads} bookings={overview.bookings} />}

        <LeakCard
          windowDays={WINDOW_DAYS}
          slaPct={slaPct}
          totalLeads={m?.totalLeads ?? 0}
          contactedInSla={m?.contactedInSla ?? 0}
          lostLeads={m?.lostLeads ?? 0}
          serviceBookings={services.count ?? 0}
          calls={callMetrics.ok ? callMetrics.data : null}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TabLinks base="/admin" tabs={TABS} active={tab} />
      {body}
    </div>
  );
}
