"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataGrid, type GridColumn } from "@/components/grid/DataGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { deleteOfferAction, saveOfferAction } from "@/server/actions/admin-catalog";
import type { Offer } from "@/types/domain";

const ANY = "__all__";

export function OffersPanel({ offers, models }: { offers: Offer[]; models: { id: string; name: string }[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Offer | null>(null);
  const [open, setOpen] = useState(false);

  const modelName = (id?: string | null) => (id ? models.find((m) => m.id === id)?.name ?? "Model" : "All models");

  const remove = async (offer: Offer) => {
    const ok = await confirm({
      title: "Delete this offer?",
      description: "It disappears from the public offers page straight away.",
      confirmLabel: "Delete offer",
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteOfferAction(offer.id);
    if (res.ok) {
      toast.success("Offer deleted.");
      router.refresh();
    } else {
      toast.error(res.error?.message ?? "Could not delete the offer.");
    }
  };

  const columns: GridColumn<Offer>[] = [
    { id: "title", header: "Offer", accessor: (o) => o.title, cell: (o) => <span className="font-bold text-ink">{o.title}</span> },
    { id: "badge", header: "Badge", accessor: (o) => o.badge ?? "" },
    { id: "model", header: "Applies to", accessor: (o) => modelName(o.model_id), filter: "select" },
    { id: "until", header: "Valid until", accessor: (o) => o.valid_until },
    {
      id: "status",
      header: "Status",
      accessor: (o) => (o.active ? "Live" : "Hidden"),
      filter: "select",
      cell: (o) => (
        <Badge variant={o.active ? "ok" : "outline"} className="text-[10px]">
          {o.active ? "Live" : "Hidden"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      sortable: false,
      accessor: () => "",
      cell: (o) => (
        <span className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => { setEditing(o); setOpen(true); }}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
          <Button variant="ghost" size="sm" aria-label="Delete offer" className="h-8 w-8 px-0 text-danger hover:bg-danger/10" onClick={() => void remove(o)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <DataGrid
        columns={columns}
        rows={offers}
        rowKey={(o) => o.id}
        exportName="offers"
        emptyMessage="No offers yet."
        toolbar={
          <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> New offer
          </Button>
        }
      />
      <OfferDialog open={open} onOpenChange={setOpen} offer={editing} models={models} />
    </>
  );
}

function OfferDialog({
  open,
  onOpenChange,
  offer,
  models,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer | null;
  models: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [badge, setBadge] = useState("");
  const [modelId, setModelId] = useState(ANY);
  const [until, setUntil] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(offer?.title ?? "");
    setBody(offer?.body ?? "");
    setBadge(offer?.badge ?? "");
    setModelId(offer?.model_id ?? ANY);
    setUntil(offer?.valid_until ?? `${new Date().getFullYear()}-12-31`);
    setActive(offer?.active ?? true);
    setError(null);
  }, [open, offer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and details are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await saveOfferAction({
        id: offer?.id,
        title: title.trim(),
        body: body.trim(),
        badge: badge.trim() || null,
        model_id: modelId === ANY ? null : modelId,
        valid_until: until,
        is_active: active,
      });
      if (!res.ok) {
        setError(res.error?.message ?? "Could not save the offer.");
        return;
      }
      toast.success(offer ? "Offer updated." : "Offer created.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{offer ? "Edit offer" : "New offer"}</DialogTitle>
          <DialogDescription>
            Offers describe a benefit in plain words. Prices still come from the model and price tables.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className="h-11" />
          </FormField>
          <FormField label="Details" required>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} required className="min-h-[88px] text-sm" />
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Badge (optional)">
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={24} placeholder="Festive" className="h-11" />
            </FormField>
            <FormField label="Valid until" required>
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} required className="h-11" />
            </FormField>
            <FormField label="Applies to">
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm">
                <option value={ANY}>All models</option>
                {models.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
              </select>
            </FormField>
            <FormField label="Visibility">
              <label className="flex h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
                Live on the website
              </label>
            </FormField>
          </div>
          {error && (<p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">{error}</p>)}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>{saving ? "Saving…" : "Save offer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
