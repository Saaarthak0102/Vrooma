"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/forms/PhoneField";
import { createDemoCarAction, createShowroomAction, createWorkshopAction } from "@/server/actions/admin-network";

export type NetworkAddKind = "showroom" | "workshop" | "demo";

export interface NetworkOptions {
  cities: { id: string; name: string }[];
  showrooms: { id: string; name: string }[];
  variants: { id: string; label: string }[];
}

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

const COPY: Record<NetworkAddKind, { button: string; title: string; description: string }> = {
  showroom: { button: "Add showroom", title: "Add a showroom", description: "It appears on the public showroom page and in lead routing right away." },
  workshop: { button: "Add workshop", title: "Add a workshop", description: "Bays set how many service bookings fit in each slot." },
  demo: { button: "Add demo car", title: "Add a demo car", description: "Buyers pick it when booking a test drive at that showroom." },
};

export function NetworkAddDialog({ kind, options }: { kind: NetworkAddKind; options: NetworkOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    cityId: options.cities[0]?.id ?? "",
    name: "",
    address: "",
    phone: "",
    bays: "8",
    showroomId: options.showrooms[0]?.id ?? "",
    variantId: options.variants[0]?.id ?? "",
    regLabel: "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res =
        kind === "showroom"
          ? await createShowroomAction({ cityId: form.cityId, name: form.name, address: form.address, phone: form.phone })
          : kind === "workshop"
            ? await createWorkshopAction({ cityId: form.cityId, name: form.name, address: form.address, phone: form.phone, bays: Number(form.bays) })
            : await createDemoCarAction({ showroomId: form.showroomId, variantId: form.variantId, regLabel: form.regLabel });
      if (res.ok) {
        toast.success(`${COPY[kind].button.replace("Add ", "")} added.`);
        setOpen(false);
        setForm((f) => ({ ...f, name: "", address: "", phone: "", regLabel: "" }));
        router.refresh();
      } else {
        setError(res.error?.message ?? "Could not save.");
      }
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const copy = COPY[kind];

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5 text-xs" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> {copy.button}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            {kind !== "demo" && (
              <>
                <FormField label="City" required>
                  <select className={selectClass} value={form.cityId} onChange={set("cityId")} aria-label="City">
                    {options.cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Name" required>
                  <Input value={form.name} onChange={set("name")} maxLength={80} placeholder={kind === "showroom" ? "Aliganj Showroom" : "Alambagh Service Hub"} />
                </FormField>
                <FormField label="Address" required>
                  <Input value={form.address} onChange={set("address")} maxLength={200} placeholder="Street, area, city" />
                </FormField>
                <FormField label="Phone" required>
                  <Input type="tel" value={form.phone} onChange={set("phone")} maxLength={20} placeholder="+91 522 400 0000" />
                </FormField>
              </>
            )}
            {kind === "workshop" && (
              <FormField label="Service bays" required>
                <Input type="number" min={1} max={50} step={1} value={form.bays} onChange={set("bays")} />
              </FormField>
            )}
            {kind === "demo" && (
              <>
                <FormField label="Showroom" required>
                  <select className={selectClass} value={form.showroomId} onChange={set("showroomId")} aria-label="Showroom">
                    {options.showrooms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Variant" required>
                  <select className={selectClass} value={form.variantId} onChange={set("variantId")} aria-label="Variant">
                    {options.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Plate label" required>
                  <Input value={form.regLabel} onChange={set("regLabel")} maxLength={40} placeholder="UP32 ** 1234" />
                </FormField>
              </>
            )}
            {error && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
