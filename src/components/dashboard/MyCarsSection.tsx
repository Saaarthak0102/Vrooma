"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Car, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil, expiryTone, REMINDER_CONSENT_TEXT, serviceProgress, type VehicleSummary } from "@/lib/garage";
import { deleteVehicleAction, getMyGarageAction, saveVehicleAction, setReminderConsentAction } from "@/server/actions/garage";

const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));

/** "in 12 days", "today", "expired 3 days ago" */
function whenText(days: number): string {
  if (days < 0) return `expired ${-days} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

const CARD_TINT = { backgroundColor: "color-mix(in srgb, var(--ink) 2%, white)" } as const;
const HOVER = "[@media(hover:hover)_and_(pointer:fine)]:hover:border-black/20";

/** A document or service date as a coloured chip: ok, within 30 days, or expired. */
function DateChip({ label, date }: { label: string; date: string | null }) {
  if (!date) return null;
  const days = daysUntil(date, istToday());
  const tone = expiryTone(days);
  return (
    <Badge variant={tone} className="gap-1 px-2.5 py-0.5 text-[11px]" title={fmtDate(date)}>
      <span className="font-bold">{label}</span>
      <span className="font-medium">{whenText(days)}</span>
    </Badge>
  );
}

function ServiceBar({ lastOn, nextOn }: { lastOn: string | null; nextOn: string | null }) {
  const progress = serviceProgress(lastOn, nextOn, istToday());
  if (progress === null || !nextOn) return null;
  const days = daysUntil(nextOn, istToday());
  const fill = days < 0 ? "bg-danger" : progress >= 0.85 ? "bg-warn" : "bg-accent";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-ink-soft">Next service</span>
        <span className={`font-semibold ${days < 0 ? "text-danger" : "text-ink"}`}>
          {fmtDate(nextOn)} · {whenText(days)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Time since last service"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
      >
        <div className={`h-full rounded-full transition-[width] duration-200 ease-out ${fill}`} style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
      </div>
    </div>
  );
}

interface FormState {
  id?: string;
  regNo: string;
  modelName: string;
  variantName: string;
  odometerKm: string;
  insuranceExpiry: string;
  pucExpiry: string;
  warrantyEnd: string;
  boughtFromVrooma: boolean;
}
const empty: FormState = { regNo: "", modelName: "", variantName: "", odometerKm: "", insuranceExpiry: "", pucExpiry: "", warrantyEnd: "", boughtFromVrooma: false };

/** The buyer's own cars, their next service and document expiry dates, and the reminder opt-in (off until ticked). */
export function MyCarsSection() {
  const confirm = useConfirm();
  const [vehicles, setVehicles] = useState<VehicleSummary[] | null>(null);
  const [remindersOn, setRemindersOn] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyGarageAction();
    if (res.ok) {
      setVehicles(res.data.vehicles);
      setRemindersOn(res.data.remindersOn);
    } else {
      setVehicles([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const res = await saveVehicleAction({ ...form, boughtFromVrooma: form.boughtFromVrooma });
    setSaving(false);
    if (res.ok) {
      toast.success("Car saved.");
      setForm(null);
      void load();
    } else {
      toast.error(res.error.message);
    }
  };

  const toggleReminders = async (next: boolean) => {
    setRemindersOn(next);
    const res = await setReminderConsentAction(next);
    if (!res.ok) {
      setRemindersOn(!next);
      toast.error(res.error.message);
    } else {
      toast.success(next ? "Reminders are on." : "Reminders are off.");
    }
  };

  const remove = async (v: VehicleSummary) => {
    const yes = await confirm({
      title: `Remove ${v.modelName}?`,
      description: "Its service history and saved dates are deleted too.",
      confirmLabel: "Remove car",
      destructive: true,
    });
    if (!yes) return;
    const res = await deleteVehicleAction(v.id);
    if (res.ok) {
      toast.success("Car removed.");
      void load();
    } else {
      toast.error(res.error.message);
    }
  };

  const edit = (v: VehicleSummary) =>
    setForm({
      id: v.id,
      regNo: "",
      modelName: v.modelName,
      variantName: v.variantName ?? "",
      odometerKm: v.odometerKm != null ? String(v.odometerKm) : "",
      insuranceExpiry: v.insuranceExpiry ?? "",
      pucExpiry: v.pucExpiry ?? "",
      warrantyEnd: v.warrantyEnd ?? "",
      boughtFromVrooma: false,
    });

  // Reserve the space while loading so the page does not jump when the cars arrive.
  if (vehicles === null) {
    return (
      <section aria-busy="true" aria-label="My cars" className="rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="hidden h-28 w-full rounded-xl sm:block" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="my-cars-heading"
      className="fade-up-item space-y-5 rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent-ink">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h2 id="my-cars-heading" className="text-base font-bold tracking-tight text-ink">
              My cars
            </h2>
            <p className="text-xs text-ink-soft">Service and insurance dates in one place</p>
          </div>
        </div>
        <Button variant="link" size="sm" className="h-11 gap-1 p-0 text-xs font-semibold text-accent-ink hover:underline" onClick={() => setForm(empty)} disabled={vehicles.length >= 5}>
          <Plus className="h-3.5 w-3.5" /> Add a car
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-dashed border-border p-5 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-ink-mute">
            <Car className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-ink">No cars yet</p>
          <p className="max-w-sm text-xs text-ink-soft">
            Add yours to keep its service and insurance dates in one place. A service you book with us is added automatically after your visit.
          </p>
          <Button variant="secondary" size="sm" className="h-11 text-xs" onClick={() => setForm(empty)}>
            Add a car
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v, i) => (
            <article
              key={v.id}
              style={{ ...CARD_TINT, "--i": i } as React.CSSProperties}
              className={`fade-up-item space-y-3 rounded-xl border border-border p-3 transition-colors sm:p-3.5 ${HOVER}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-ink sm:text-base">
                    {v.modelName}
                    {v.variantName ? ` ${v.variantName}` : ""}
                  </h3>
                  <p className="font-mono text-[11px] font-medium text-ink-soft">{v.regMasked}</p>
                </div>
                <div className="-mr-2 -mt-1 flex shrink-0">
                  <Button size="icon" variant="ghost" aria-label={`Edit ${v.modelName}`} onClick={() => edit(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-danger" aria-label={`Remove ${v.modelName}`} onClick={() => void remove(v)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {v.odometerKm != null && (
                <p className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-soft">Odometer</span>
                  <span className="font-semibold tabular-nums text-ink">{v.odometerKm.toLocaleString("en-IN")} km</span>
                </p>
              )}

              <ServiceBar lastOn={v.lastService?.servicedOn ?? null} nextOn={v.nextService?.dueOn ?? null} />
              {v.nextService?.dueKm && !v.nextService.dueOn && (
                <p className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-soft">Next service</span>
                  <span className="font-semibold tabular-nums text-ink">at {v.nextService.dueKm.toLocaleString("en-IN")} km</span>
                </p>
              )}

              {(v.insuranceExpiry || v.pucExpiry || v.warrantyEnd) && (
                <div className="flex flex-wrap gap-1.5">
                  <DateChip label="Insurance" date={v.insuranceExpiry} />
                  <DateChip label="PUC" date={v.pucExpiry} />
                  <DateChip label="Warranty" date={v.warrantyEnd} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-ink/5 p-3 transition-colors ${HOVER}`}>
        <Checkbox checked={remindersOn} onCheckedChange={(c) => void toggleReminders(c === true)} className="mt-0.5" aria-label="Send me service and insurance reminders" />
        <span className="text-xs leading-relaxed text-ink-soft">
          <span className="font-bold text-ink">Send me service and insurance reminders.</span> {REMINDER_CONSENT_TEXT}
        </span>
      </label>

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit car" : "Add a car"}</DialogTitle>
            <DialogDescription>Your registration number is stored privately and is always shown masked.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-ink-soft">Registration number{form.id ? " (enter again to confirm)" : ""}</span>
                <Input value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} placeholder="UP32AB1234" autoCapitalize="characters" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-ink-soft">Model</span>
                <Input value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-ink-soft">Variant (optional)</span>
                <Input value={form.variantName} onChange={(e) => setForm({ ...form, variantName: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-ink-soft">Odometer (km)</span>
                <Input inputMode="numeric" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-ink-soft">Insurance valid until</span>
                <Input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-ink-soft">PUC valid until</span>
                <Input type="date" value={form.pucExpiry} onChange={(e) => setForm({ ...form, pucExpiry: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-ink-soft">Warranty ends</span>
                <Input type="date" value={form.warrantyEnd} onChange={(e) => setForm({ ...form, warrantyEnd: e.target.value })} />
              </label>
              <label className="flex min-h-11 items-center gap-2 text-xs text-ink sm:col-span-2">
                <Checkbox checked={form.boughtFromVrooma} onCheckedChange={(c) => setForm({ ...form, boughtFromVrooma: c === true })} />
                I bought this car from Vrooma
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} status={saving ? "loading" : "idle"} loadingText="Saving…" disabled={!form?.regNo || !form?.modelName}>
              Save car
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
