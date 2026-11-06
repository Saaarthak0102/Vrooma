"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/forms/PhoneField";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteRoutingRuleAction, saveRoutingRuleAction } from "@/server/actions/admin-network";
import type { RoutingRuleRow, StaffPoolMember } from "@/server/repositories/admin-team";

const ANY = "__any__";

export interface RoutingPanelProps {
  rules: RoutingRuleRow[];
  showrooms: { id: string; name: string }[];
  models: { id: string; name: string }[];
  pool: StaffPoolMember[];
}

export function RoutingPanel({ rules, showrooms, models, pool }: RoutingPanelProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<RoutingRuleRow | null>(null);
  const [open, setOpen] = useState(false);

  const remove = async (rule: RoutingRuleRow) => {
    const ok = await confirm({
      title: "Delete this routing rule?",
      description: "If this was the showroom's only active rule, its new leads will stay unassigned.",
      confirmLabel: "Delete rule",
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteRoutingRuleAction(rule.id);
    if (res.ok) {
      toast.success("Routing rule deleted.");
      router.refresh();
    } else {
      toast.error(res.error?.message ?? "Could not delete the rule.");
    }
  };

  const columns: GridColumn<RoutingRuleRow>[] = [
    { id: "showroom", header: "Showroom", accessor: (r) => r.showroom_name, filter: "select", cell: (r) => <span className="font-bold text-ink">{r.showroom_name}</span> },
    { id: "model", header: "Model", accessor: (r) => r.model_name ?? "All models", filter: "select" },
    { id: "pool", header: "Consultant pool", accessor: (r) => r.consultants.map((c) => c.name).join(", ") },
    {
      id: "active",
      header: "Status",
      accessor: (r) => (r.is_active ? "Active" : "Paused"),
      filter: "select",
      cell: (r) => (
        <Badge variant={r.is_active ? "ok" : "outline"} className="text-[10px]">
          {r.is_active ? "Active" : "Paused"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      sortable: false,
      accessor: () => "",
      cell: (r) => (
        <span className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => { setEditing(r); setOpen(true); }}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
          <Button variant="ghost" size="sm" aria-label="Delete rule" className="h-8 w-8 px-0 text-danger hover:bg-danger/10" onClick={() => void remove(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">
        A new lead goes to the least-loaded available consultant in the pools of the showroom&apos;s active rules that
        match its model (or cover all models). If none match, any other active rule at that showroom is used. With no
        active rule at the showroom the lead stays unassigned, so keep at least one rule per showroom.
      </p>
      <DataGrid
        columns={columns}
        rows={rules}
        rowKey={(r) => r.id}
        exportName="routing-rules"
        emptyMessage="No rules yet. Leads will stay unassigned until you add one per showroom."
        toolbar={
          <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Add rule
          </Button>
        }
      />
      <RuleDialog open={open} onOpenChange={setOpen} rule={editing} showrooms={showrooms} models={models} pool={pool} />
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  rule,
  showrooms,
  models,
  pool,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RoutingRuleRow | null;
  showrooms: { id: string; name: string }[];
  models: { id: string; name: string }[];
  pool: StaffPoolMember[];
}) {
  const router = useRouter();
  const [showroomId, setShowroomId] = useState("");
  const [modelId, setModelId] = useState(ANY);
  const [active, setActive] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setShowroomId(rule?.showroom_id ?? showrooms[0]?.id ?? "");
    setModelId(rule?.model_id ?? ANY);
    setActive(rule?.is_active ?? true);
    setPicked(rule?.consultants.map((c) => c.id) ?? []);
    setError(null);
  }, [open, rule, showrooms]);

  const candidates = pool.filter((p) => p.showroom_id === showroomId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await saveRoutingRuleAction({
        id: rule?.id,
        showroom_id: showroomId,
        model_id: modelId === ANY ? null : modelId,
        // Routing does not use priority; keep whatever the rule already has.
        priority: rule?.priority ?? 1,
        is_active: active,
        consultant_ids: picked.filter((id) => candidates.some((c) => c.id === id)),
      });
      if (!res.ok) {
        setError(res.error?.message ?? "Could not save the rule.");
        return;
      }
      toast.success(rule ? "Routing rule updated." : "Routing rule added.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{rule ? "Edit routing rule" : "Add routing rule"}</DialogTitle>
          <DialogDescription>Choose who receives new leads for a showroom, and optionally for one model.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Showroom" required>
              <select
                value={showroomId}
                onChange={(e) => { setShowroomId(e.target.value); setPicked([]); }}
                className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
              >
                {showrooms.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </FormField>
            <FormField label="Model">
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm">
                <option value={ANY}>All models</option>
                {models.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
              </select>
            </FormField>
            <FormField label="Status">
              <label className="flex h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
                Active
              </label>
            </FormField>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Consultant pool</legend>
            {candidates.length === 0 ? (
              <p className="text-xs text-ink-mute">No active consultants are assigned to this showroom yet.</p>
            ) : (
              candidates.map((c) => (
                <label key={c.id} className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={picked.includes(c.id)}
                    onChange={(e) => setPicked((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))}
                    className="h-4 w-4"
                  />
                  {c.name}
                </label>
              ))
            )}
          </fieldset>
          {error && (<p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">{error}</p>)}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving || candidates.length === 0}>
              {saving ? "Saving…" : rule ? "Save rule" : "Add rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
