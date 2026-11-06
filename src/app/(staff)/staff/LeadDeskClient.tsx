"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, FileSpreadsheet, Handshake } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { SlaTimer } from "@/components/staff/SlaTimer";
import { LeadDrawer } from "@/components/staff/LeadDrawer";
import { LeadImportDialog } from "@/components/staff/LeadImportDialog";
import { LeadOverview, leadMatches, type LeadFilter } from "@/components/staff/LeadOverview";
import { Button } from "@/components/ui/button";
import { updateLeadStatusAction } from "@/server/actions/leads";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus, Role } from "@/types/domain";

const STAGE_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  test_drive_booked: "Test drive booked",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

/** Stages a consultant can set straight from the grid. "Lost" needs a reason, so it opens the drawer. */
const INLINE_STAGES: LeadStatus[] = ["contacted", "test_drive_booked", "negotiating", "won"];

export function LeadDeskClient({ initialLeads, viewerRole }: { initialLeads: Lead[]; viewerRole: Role }) {
  const router = useRouter();
  const params = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [openId, setOpenId] = useState<string | null>(params.get("lead"));
  const [importOpen, setImportOpen] = useState(params.get("import") === "1");
  // "Now" is only known after mount, so server and client markup match.
  const [now, setNow] = useState<number | null>(null);
  // One filter at a time: a clicked KPI or chart slice narrows the table below.
  const [filter, setFilter] = useState<LeadFilter>(null);

  useEffect(() => setLeads(initialLeads), [initialLeads]);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Live inbox: RLS decides which leads this person receives.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel("lead-desk-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (payload) => {
        if (payload.eventType === "INSERT") {
          // The realtime row has no joined names; refetch for a complete row.
          router.refresh();
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as Partial<Lead> & { id: string };
          setLeads((prev) => prev.map((l) => (l.id === row.id ? { ...l, ...row } : l)));
        } else if (payload.eventType === "DELETE") {
          setLeads((prev) => prev.filter((l) => l.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const setOpen = (id: string | null) => {
    setOpenId(id);
    const next = new URLSearchParams(Array.from(params.entries()));
    if (id) next.set("lead", id);
    else next.delete("lead");
    router.replace(next.toString() ? `/staff?${next.toString()}` : "/staff", { scroll: false });
  };

  const patchLead = (patch: Partial<Lead> & { id: string }) =>
    setLeads((prev) => prev.map((l) => (l.id === patch.id ? { ...l, ...patch } : l)));

  const changeStage = async (lead: Lead, next: string) => {
    if (next === lead.status) return;
    if (next === "lost") {
      setOpen(lead.id);
      toast.info("Add the reason in the panel to mark this lead lost.");
      return;
    }
    const before = lead.status;
    patchLead({ id: lead.id, status: next as LeadStatus });
    const res = await updateLeadStatusAction(lead.id, next as LeadStatus);
    if (!res.ok) {
      patchLead({ id: lead.id, status: before });
      toast.error(res.error?.message ?? "Could not change the stage.");
    }
  };

  // Needs-attention first: unanswered leads by earliest SLA deadline, then everything else newest first.
  const rows = useMemo(() => {
    const unanswered = leads
      .filter((l) => l.status === "new")
      .sort((a, b) => a.sla_due_at.localeCompare(b.sla_due_at));
    const rest = leads
      .filter((l) => l.status !== "new")
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return [...unanswered, ...rest];
  }, [leads]);

  const stats = useMemo(() => {
    const fresh = leads.filter((l) => l.status === "new");
    return {
      fresh: fresh.length,
      overdue: now === null ? null : fresh.filter((l) => new Date(l.sla_due_at).getTime() < now).length,
      active: leads.filter((l) => ["contacted", "test_drive_booked", "negotiating"].includes(l.status)).length,
      won: leads.filter((l) => l.status === "won").length,
    };
  }, [leads, now]);

  const externalFilter = useMemo(
    () => (filter ? (l: Lead) => leadMatches(l, filter, now) : null),
    [filter, now]
  );

  const toggleKpi = (key: "new" | "overdue" | "active" | "won", label: string) =>
    setFilter((f) => (f?.kind === "kpi" && f.key === key ? null : { kind: "kpi", key, label }));
  const kpiActive = (key: string) => filter?.kind === "kpi" && filter.key === key;

  const columns: GridColumn<Lead>[] = [
    {
      id: "sla",
      header: "SLA",
      accessor: (l) => (l.status === "new" ? l.sla_due_at : ""),
      cell: (l) => <SlaTimer dueAt={l.sla_due_at} firstContactedAt={l.first_contacted_at} />,
    },
    {
      id: "name",
      header: "Customer",
      accessor: (l) => l.name,
      cell: (l) => <span className="font-bold text-ink">{l.name}</span>,
    },
    { id: "phone", header: "Phone", accessor: (l) => l.phone },
    { id: "interest", header: "Interest", accessor: (l) => l.model_name || "General enquiry" },
    {
      id: "source",
      header: "Source",
      accessor: (l) => l.source.replace("_", " "),
      filter: "select",
      cell: (l) => <span className="capitalize">{l.source.replace("_", " ")}</span>,
    },
    {
      id: "stage",
      header: "Stage",
      accessor: (l) => STAGE_LABEL[l.status],
      filter: "select",
      cell: (l) =>
        l.status === "new" || l.status === "lost" || l.status === "won" ? (
          // New leads move on by replying; closed leads are re-opened in the panel (managers only).
          <span className="font-semibold">{STAGE_LABEL[l.status]}</span>
        ) : (
          <select
            value={l.status}
            aria-label={`Stage for ${l.name}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => void changeStage(l, e.target.value)}
            className="h-8 rounded-md border border-border bg-bg px-1.5 text-xs font-semibold"
          >
            {INLINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
            <option value="lost">Lost…</option>
          </select>
        ),
    },
    { id: "owner", header: "Assigned to", accessor: (l) => l.assigned_consultant_name ?? "Unassigned", filter: "select" },
    {
      id: "created",
      header: "Received",
      accessor: (l) => l.created_at,
      cell: (l) => (
        <span className="text-ink-soft">
          {new Date(l.created_at).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Awaiting first reply"
          onClick={() => toggleKpi("new", "Awaiting reply")}
          active={kpiActive("new")}
          value={stats.fresh}
          subtitle="5-minute target"
          icon={<Clock className="h-4 w-4 text-warning" />}
        />
        <StatCard
          label="Overdue"
          onClick={() => toggleKpi("overdue", "Overdue")}
          active={kpiActive("overdue")}
          value={stats.overdue ?? "–"}
          subtitle="Past the SLA"
          icon={<AlertTriangle className="h-4 w-4 text-danger" />}
        />
        <StatCard
          label="In progress"
          onClick={() => toggleKpi("active", "In progress")}
          active={kpiActive("active")}
          value={stats.active}
          subtitle="Contacted to negotiating"
          icon={<Handshake className="h-4 w-4 text-accent-ink" />}
        />
        <StatCard
          label="Won"
          onClick={() => toggleKpi("won", "Won")}
          active={kpiActive("won")}
          value={stats.won}
          subtitle="Delivered"
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        />
      </div>

      <LeadOverview leads={leads} filter={filter?.kind === "kpi" ? null : filter} onFilter={setFilter} />

      {filter && (
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          Showing: <strong className="text-ink">{filter.label}</strong>
          <button type="button" onClick={() => setFilter(null)} className="font-bold text-accent-ink underline">
            Show all leads
          </button>
        </p>
      )}

      <DataGrid
        externalFilter={externalFilter}
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        onRowClick={(l) => setOpen(l.id)}
        activeRowKey={openId}
        searchPlaceholder="Search name, phone, car…"
        exportName="leads"
        emptyMessage="No leads yet. New enquiries appear here the moment they arrive."
        toolbar={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 text-xs">
              <a href="/api/export/daily-csv" download>
                DMS export
              </a>
            </Button>
          </>
        }
      />

      <LeadDrawer
        leadId={openId}
        viewerRole={viewerRole}
        onClose={() => setOpen(null)}
        onLeadChanged={patchLead}
      />
      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
