"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatINR } from "@/lib/money";
import type { PriceBand } from "@/lib/price-band";
import { getPriceBandAction, getTradeInPhotosAction } from "@/server/actions/stock";
import type { TradeInRow } from "@/server/repositories/stock";

/** Read-only workspace for a trade-in request: the car, its photos and a manager-only valuation guide. */
export function TradeInDrawer({ request, onClose }: { request: TradeInRow | null; onClose: () => void }) {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [band, setBand] = useState<PriceBand | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const requestId = request?.id ?? null;
  useEffect(() => {
    setPhotos(null);
    setBand(undefined);
    setError(null);
    if (!request) return;
    void (async () => {
      const [p, b] = await Promise.all([
        request.photo_count > 0 ? getTradeInPhotosAction(request.id) : Promise.resolve(null),
        getPriceBandAction({ model_name: request.model, year: request.year, km: request.km }),
      ]);
      setPhotos(p && p.ok ? p.data : []);
      if (b.ok) setBand(b.data);
      else setError(b.error?.message ?? "Price band unavailable.");
    })();
    // Reload only when a different request is opened, not on every router.refresh().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return (
    <Sheet open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full space-y-5 sm:max-w-xl">
        {request && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="pr-6 text-lg font-black">
                {request.make} {request.model}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {request.year} · {request.km.toLocaleString("en-IN")} km · {request.condition} condition
              </SheetDescription>
            </SheetHeader>

            <section className="space-y-1 rounded-xl border border-border p-4 text-xs">
              <p className="font-bold text-ink">{request.customer_name ?? "Customer"}</p>
              {request.customer_phone && (
                <a href={`tel:${request.customer_phone}`} className="font-semibold text-accent-ink hover:underline">
                  {request.customer_phone}
                </a>
              )}
              <p className="text-ink-soft">
                Handled by {request.consultant_name ?? "unassigned"} · lead {request.lead_ref ?? "-"}
              </p>
              {request.notes && <p className="pt-1 italic text-ink">&ldquo;{request.notes}&rdquo;</p>}
              {request.lead_id && (
                <Link
                  href={`/staff?lead=${request.lead_id}`}
                  className="inline-flex items-center gap-1 pt-1 font-semibold text-accent-ink hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open the lead to reply or change its stage
                </Link>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Sparkles className="h-4 w-4 text-accent-ink" />
                  Valuation guide
                </h3>
                <span className="flex items-center gap-1 rounded-pill bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                  <ShieldAlert className="h-3 w-3" />
                  Manager only
                </span>
              </div>
              {error ? (
                <p className="text-xs text-danger">{error}</p>
              ) : band === undefined ? (
                <p className="text-xs text-ink-mute">Checking past sales…</p>
              ) : band === null ? (
                <p className="text-xs text-ink-soft">No comparable past sales yet. Value this car on inspection.</p>
              ) : (
                <>
                  <p className="text-xl font-black text-ink">
                    {formatINR(band.low)} – {formatINR(band.high)}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    Resale band · {band.confidence} confidence · {band.rationale} Offer less than this to leave a margin.
                  </p>
                </>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-ink">Photos ({request.photo_count})</h3>
              {request.photo_count === 0 ? (
                <p className="text-xs text-ink-mute">The customer did not upload photos.</p>
              ) : photos === null ? (
                <p className="text-xs text-ink-mute">Loading photos…</p>
              ) : photos.length === 0 ? (
                <p className="text-xs text-ink-mute">Photos could not be loaded.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt={`Trade-in photo ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg border border-border object-cover" />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
