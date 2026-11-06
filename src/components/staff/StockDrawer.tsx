"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Eye, ShieldAlert, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/PhoneField";
import { formatINR } from "@/lib/money";
import {
  INSPECTION_CATEGORIES,
  readScorecard,
  scoreFromScorecard,
  type Scorecard,
} from "@/lib/inspection-score";
import type { PriceBand } from "@/lib/price-band";
import { getPriceBandAction } from "@/server/actions/stock";
import { revealUsedCarRegAction } from "@/server/actions/used-car-reg";
import {
  saveUsedCarAction,
  setUsedCarFinalPriceAction,
  updateUsedCarStatusAction,
} from "@/server/actions/admin-catalog";
import type { StockRow } from "@/server/repositories/stock";

export function StockDrawer({ car, onClose }: { car: StockRow | null; onClose: () => void }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [band, setBand] = useState<PriceBand | null | undefined>(undefined);
  const [bandError, setBandError] = useState<string | null>(null);
  const [card, setCard] = useState<Scorecard>({});
  const [reg, setReg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setReg(null);
    setBand(undefined);
    setBandError(null);
    if (!car) return;
    setPrice(String(car.price));
    setCard(readScorecard(car.inspection));
    void (async () => {
      const res = await getPriceBandAction({
        model_name: car.model_name,
        year: car.year,
        km: car.km,
        fuel: car.fuel,
      });
      if (res.ok) setBand(res.data);
      else setBandError(res.error?.message ?? "Price band unavailable.");
    })();
  }, [car]);

  const run = async (key: string, task: () => Promise<{ ok: boolean; message?: string }>, success: string) => {
    setBusy(key);
    try {
      const r = await task();
      if (r.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(r.message ?? "Something went wrong.");
      }
    } finally {
      setBusy(null);
    }
  };

  const score = scoreFromScorecard(card);

  return (
    <Sheet open={Boolean(car)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full space-y-5 sm:max-w-xl">
        {car && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="pr-6 text-lg font-black">
                {car.model_name} {car.variant_name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {car.stock_id} · {car.year} · {car.km.toLocaleString("en-IN")} km · {car.fuel}
              </SheetDescription>
            </SheetHeader>

            {/* Price: AI suggests, the manager sets */}
            <section className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Sparkles className="h-4 w-4 text-accent-ink" />
                  Suggested price band
                </h3>
                <span className="flex items-center gap-1 rounded-pill bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                  <ShieldAlert className="h-3 w-3" />
                  Manager only
                </span>
              </div>

              {bandError ? (
                <p className="text-xs text-danger">{bandError}</p>
              ) : band === undefined ? (
                <p className="text-xs text-ink-mute">Checking past sales…</p>
              ) : band === null ? (
                <p className="text-xs text-ink-soft">
                  No comparable past sales of this model yet, so there is no suggestion. Set the price from your own
                  judgement.
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xl font-black text-ink">
                    {formatINR(band.low)} – {formatINR(band.high)}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    Median {formatINR(band.median)} · {band.confidence} confidence · {band.rationale}
                  </p>
                </div>
              )}

              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = Number(price);
                  void run(
                    "price",
                    async () => {
                      const res = await setUsedCarFinalPriceAction(car.id, value);
                      return { ok: res.ok, message: res.ok ? undefined : res.error?.message };
                    },
                    `Final price set to ${formatINR(value)}.`
                  );
                }}
              >
                <label className="sr-only" htmlFor="final-price">
                  Final listing price in rupees
                </label>
                <Input
                  id="final-price"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-11 font-mono font-bold"
                  required
                />
                <Button type="submit" variant="primary" size="sm" className="h-11 shrink-0 px-4 text-xs" disabled={busy === "price"}>
                  Set final price
                </Button>
              </form>
              <p className="text-[11px] text-ink-mute">The Used-Car Manager sets every final price shown to buyers.</p>
            </section>

            {/* Status */}
            <section className="space-y-2">
              <FormField label="Stock status">
                <select
                  value={car.status}
                  disabled={busy === "status"}
                  onChange={(e) =>
                    void run(
                      "status",
                      async () => {
                        const res = await updateUsedCarStatusAction(car.id, e.target.value as "available" | "booked" | "sold");
                        return { ok: res.ok, message: res.ok ? undefined : res.error?.message };
                      },
                      "Status updated."
                    )
                  }
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
                >
                  <option value="available">Available for sale</option>
                  <option value="booked">Booked by a buyer</option>
                  <option value="sold">Sold</option>
                </select>
              </FormField>
            </section>

            {/* Inspection scorecard */}
            <section className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">Inspection scorecard</h3>
                <span className="text-xs font-bold tabular-nums text-ink">{score === null ? "Not scored" : `${score}/100`}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {INSPECTION_CATEGORIES.map((category) => (
                  <label key={category} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-ink-soft">{category}</span>
                    <select
                      value={card[category] ?? ""}
                      onChange={(e) =>
                        setCard((prev) => ({ ...prev, [category]: e.target.value ? Number(e.target.value) : undefined }))
                      }
                      className="h-9 w-24 rounded-md border border-border bg-bg px-2 text-xs"
                    >
                      <option value="">Rate…</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 text-xs"
                disabled={score === null || busy === "inspection"}
                onClick={() =>
                  void run(
                    "inspection",
                    async () => {
                      // Patch update: only the inspection fields change; photos, price and plate stay untouched.
                      const res = await saveUsedCarAction({
                        id: car.id,
                        inspection: { ...car.inspection, scorecard: card, inspected_at: new Date().toISOString() },
                        inspection_score: score,
                      });
                      return { ok: res.ok, message: res.ok ? undefined : res.error?.message };
                    },
                    "Inspection saved."
                  )
                }
              >
                Save inspection
              </Button>
              {score === null && <p className="text-[11px] text-ink-mute">Rate all eight areas to save a score.</p>}
            </section>

            {/* Registration reveal (audited) */}
            <section className="space-y-2 rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-ink">Registration number</h3>
              <p className="font-mono text-sm text-ink">{reg ?? car.reg_no_masked}</p>
              {!reg && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 gap-1.5 text-xs"
                  disabled={busy === "reg"}
                  onClick={async () => {
                    setBusy("reg");
                    const res = await revealUsedCarRegAction(car.stock_id);
                    setBusy(null);
                    if (res.ok) setReg(res.data.reg);
                    else toast.error(res.error?.message ?? "Could not reveal the number.");
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Reveal full number
                </Button>
              )}
              <p className="text-[11px] text-ink-mute">Every reveal is written to the audit log.</p>
            </section>

            <Link
              href={`/used-cars/${car.stock_id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-ink hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public page
            </Link>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
