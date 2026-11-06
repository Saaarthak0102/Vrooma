import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { listOffers } from "@/server/repositories/offers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";
import { constructMetadata } from "@/lib/seo";

export const revalidate = 300;

/** A database hiccup at build time must not fail the whole deploy: show no offers and refresh soon. */
async function safeOffers() {
  try {
    return await listOffers();
  } catch (err) {
    console.warn("[build] could not load offers, rendering empty and retrying on the next revalidation:", (err as Error)?.message);
    return [];
  }
}

export async function generateMetadata() {
  return constructMetadata({
    title: "Official Showroom Offers & Benefits in Lucknow",
    description: "Explore exclusive festival schemes, extended warranty packages, and corporate exchange bonuses across Lucknow and Kanpur showrooms.",
    path: "/offers",
  });
}

export default async function OffersPage() {
  const offers = await safeOffers();

  return (
    <PageShell
      title="Exclusive Showroom Offers & Corporate Benefits"
      subtitle="Limited-period festive benefits, exchange bonuses, and preferential finance rates available across Vrooma Lucknow showrooms."
      breadcrumbs={[{ label: "Offers" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="rounded-xl border border-border bg-white p-6 shadow-card flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="accent" className="text-xs uppercase font-semibold">
                  {offer.badge || "Special Offer"}
                </Badge>
                <span className="text-[11px] text-ink-mute flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Valid till {offer.valid_until}
                </span>
              </div>

              <h3 className="text-lg font-bold text-ink leading-snug">{offer.title}</h3>
              <p className="text-xs text-ink-soft leading-relaxed">{offer.body}</p>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-accent-ink font-semibold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Showroom Verified
              </span>
              <Button asChild variant="primary" size="sm" className="text-xs gap-1">
                <Link href="/book/test-drive">
                  <span>Claim Offer</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

