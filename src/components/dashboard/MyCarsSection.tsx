"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Car, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { daysUntil, REMINDER_CONSENT_TEXT, type VehicleSummary } from "@/lib/garage";
import { deleteVehicleAction, getMyGarageAction, saveVehicleAction, setReminderConsentAction } from "@/server/actions/garage";

const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));

function DateLine({ label, date }: { label: string; date: string | null }) {
  if (!date) return null;
  const days = daysUntil(date, istToday());
  const tone = days < 0 ? "text-danger" : days <= 30 ? "text-warning" : "text-ink-soft";
  return (
    <li className="flex justify-between gap-3 text-xs">
      <span className="text-ink-soft">{label}</span>
      <span className={`font-semibold ${tone}`}>
        {fmtDate(date)}
        {days < 0 ? " · expired" : days <= 30 ? ` · in ${days} day${days === 1 ? "" : "s"}` : ""}
      </span>
    </li>
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

  if (vehicles === null) return null;

  return (
    <section aria-labelledby="my-cars-heading" className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="my-cars-heading" className="flex items-center gap-2 text-base font-black text-ink">
          <Car className="h-4 w-4" /> My cars
        </h2>
        <Button size="sm" variant="outline" onClick={() => setForm(empty)} disabled={vehicles.length >= 5}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add a car
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Add your car to keep its service and insurance dates in one place. A service you book with us is added automatically after your visit.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <article key={v.id} className="rounded-xl border border-border/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {v.modelName}
                    {v.variantName ? ` ${v.variantName}` : ""}
                  </h3>
                  <p className="font-mono text-xs text-ink-soft">{v.regMasked}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-11 w-11 p-0" aria-label={`Edit ${v.modelName}`} onClick={() => edit(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 w-11 p-0 text-danger"
                    aria-label={`Remove ${v.modelName}`}
                    onClick={async () => {
                      const res = await deleteVehicleAction(v.id);
                      if (res.ok) void load();
                      else toast.error(res.error.message);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {v.odometerKm != null && (
                  <li className="flex justify-between text-xs">
                    <span className="text-ink-soft">Odometer</span>
                    <span className="font-semibold text-ink">{v.odometerKm.toLocaleString("en-IN")} km</span>
                  </li>
                )}
                {v.lastService && <DateLine label="Last service" date={v.lastService.servicedOn} />}
                {v.nextService?.dueOn && <DateLine label="Next service" date={v.nextService.dueOn} />}
                {v.nextService?.dueKm && !v.nextService.dueOn && (
                  <li className="flex justify-between text-xs">
                    <span className="text-ink-soft">Next service</span>
                    <span className="font-semibold">{v.nextService.dueKm.toLocaleString("en-IN")} km</span>
                  </li>
                )}
                <DateLine label="Insurance" date={v.insuranceExpiry} />
                <DateLine label="PUC" date={v.pucExpiry} />
                <DateLine label="Warranty" date={v.warrantyEnd} />
              </ul>
            </article>
          ))}
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg bg-bg-sheen/60 p-3">
        <Checkbox checked={remindersOn} onCheckedChange={(c) => void toggleReminders(c === true)} className="mt-0.5" aria-label="Send me service and insurance reminders" />
        <span className="text-xs leading-relaxed text-ink">
          <span className="font-bold">Send me service and insurance reminders.</span> {REMINDER_CONSENT_TEXT}
        </span>
      </label>

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit car" : "Add a car"}</DialogTitle>
            <DialogDescription>Your registration number is stored privately and is always shown masked.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="col-span-2 space-y-1">
                <span className="text-xs font-semibold">Registration number{form.id ? " (enter again to confirm)" : ""}</span>
                <Input value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} placeholder="UP32AB1234" autoCapitalize="characters" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold">Model</span>
                <Input value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold">Variant (optional)</span>
                <Input value={form.variantName} onChange={(e) => setForm({ ...form, variantName: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold">Odometer (km)</span>
                <Input inputMode="numeric" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold">Insurance valid until</span>
                <Input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold">PUC valid until</span>
                <Input type="date" value={form.pucExpiry} onChange={(e) => setForm({ ...form, pucExpiry: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold">Warranty ends</span>
                <Input type="date" value={form.warrantyEnd} onChange={(e) => setForm({ ...form, warrantyEnd: e.target.value })} />
              </label>
              <label className="col-span-2 flex items-center gap-2 text-xs">
                <Checkbox checked={form.boughtFromVrooma} onCheckedChange={(c) => setForm({ ...form, boughtFromVrooma: c === true })} />
                I bought this car from Vrooma
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form?.regNo || !form?.modelName}>
              Save car
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
