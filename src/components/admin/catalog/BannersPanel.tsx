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
import { deleteBannerAction, saveBannerAction } from "@/server/actions/admin-catalog";
import type { Banner } from "@/types/domain";

export function BannersPanel({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);

  const remove = async (banner: Banner) => {
    const ok = await confirm({
      title: "Delete this banner?",
      description: "It stops showing on the website straight away.",
      confirmLabel: "Delete banner",
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteBannerAction(banner.id);
    if (res.ok) {
      toast.success("Banner deleted.");
      router.refresh();
    } else {
      toast.error(res.error?.message ?? "Could not delete the banner.");
    }
  };

  const columns: GridColumn<Banner>[] = [
    { id: "sort", header: "Order", accessor: (b) => b.sort, align: "right" },
    { id: "title", header: "Banner", accessor: (b) => b.title, cell: (b) => <span className="font-bold text-ink">{b.title}</span> },
    { id: "image", header: "Image", accessor: (b) => b.image_url, cell: (b) => <span className="font-mono text-ink-soft">{b.image_url}</span> },
    { id: "href", header: "Links to", accessor: (b) => b.href },
    {
      id: "status",
      header: "Status",
      accessor: (b) => (b.active ? "Live" : "Hidden"),
      filter: "select",
      cell: (b) => (
        <Badge variant={b.active ? "ok" : "outline"} className="text-[10px]">
          {b.active ? "Live" : "Hidden"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      sortable: false,
      accessor: () => "",
      cell: (b) => (
        <span className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => { setEditing(b); setOpen(true); }}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
          <Button variant="ghost" size="sm" aria-label="Delete banner" className="h-8 w-8 px-0 text-danger hover:bg-danger/10" onClick={() => void remove(b)}>
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
        rows={banners}
        rowKey={(b) => b.id}
        exportName="banners"
        emptyMessage="No banners yet."
        toolbar={
          <Button type="button" variant="primary" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> New banner
          </Button>
        }
      />
      <BannerDialog open={open} onOpenChange={setOpen} banner={editing} nextSort={banners.length + 1} />
    </>
  );
}

function BannerDialog({
  open,
  onOpenChange,
  banner,
  nextSort,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner: Banner | null;
  nextSort: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [href, setHref] = useState("");
  const [sort, setSort] = useState("1");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(banner?.title ?? "");
    setImage(banner?.image_url ?? "");
    setHref(banner?.href ?? "");
    setSort(String(banner?.sort ?? nextSort));
    setActive(banner?.active ?? true);
    setError(null);
  }, [open, banner, nextSort]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await saveBannerAction({
        id: banner?.id,
        title: title.trim(),
        image_url: image.trim(),
        href: href.trim(),
        sort: Number(sort) || 1,
        is_active: active,
      });
      if (!res.ok) {
        setError(res.error?.message ?? "Could not save the banner.");
        return;
      }
      toast.success(banner ? "Banner updated." : "Banner created.");
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
          <DialogTitle className="text-base font-bold">{banner ? "Edit banner" : "New banner"}</DialogTitle>
          <DialogDescription>Use an image path from the site (for example /images/banners/festive.jpg) or a full URL.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className="h-11" />
          </FormField>
          <FormField label="Image path or URL" required>
            <Input value={image} onChange={(e) => setImage(e.target.value)} required className="h-11 font-mono text-sm" />
          </FormField>
          <FormField label="Links to (optional)">
            <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/offers" className="h-11 font-mono text-sm" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Order">
              <Input type="number" min={1} value={sort} onChange={(e) => setSort(e.target.value)} className="h-11" />
            </FormField>
            <FormField label="Visibility">
              <label className="flex h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
                Live
              </label>
            </FormField>
          </div>
          {error && (<p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">{error}</p>)}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>{saving ? "Saving…" : "Save banner"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
