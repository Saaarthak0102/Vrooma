import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { MapPin, Phone, Clock, Navigation, Wrench, ShieldCheck } from "lucide-react";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return constructMetadata({
    title: "Vrooma Showrooms & Service Workshops in Lucknow & Kanpur",
    description: "Find authorized Brand X showrooms and state-of-the-art service centers at Hazratganj, Gomti Nagar, Transport Nagar, and Kanpur.",
    path: "/showrooms",
  });
}

export default async function ShowroomsPage() {
  const showrooms = await listShowrooms();
  const workshops = await listWorkshops();

  return (
    <PageShell
      title="Showrooms & Certified Service Centers"
      subtitle="Experience Brand X vehicles in person or book scheduled maintenance across our Lucknow & Kanpur network."
      breadcrumbs={[{ label: "Showrooms" }]}
    >
      <div className="space-y-12">
        {/* Showrooms Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">Showroom Facilities</h2>
              <p className="text-xs text-ink-soft">Test drive lounges, vehicle delivery bays & pre-owned yards</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {showrooms.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border bg-white p-6 shadow-card flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <Badge variant="accent" className="text-xs">
                    Showroom
                  </Badge>
                  <h3 className="text-base font-bold text-ink">{s.name}</h3>
                  <p className="text-xs text-ink-soft flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                    <span>{s.address}</span>
                  </p>
                  <div className="pt-2 border-t border-border/60 space-y-1 text-xs text-ink-mute">
                    <div className="flex items-center gap-1.5 font-medium text-ink">
                      <Clock className="h-3.5 w-3.5 text-accent-ink" />
                      <span>Timings:</span>
                    </div>
                    {Object.entries(s.hours).map(([days, time]) => (
                      <div key={days} className="flex justify-between text-[11px]">
                        <span>{days}</span>
                        <span className="font-semibold text-ink-soft">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="w-1/2 text-xs gap-1.5">
                    <a href={`tel:${s.phone.replace(/\s+/g, "")}`}>
                      <Phone className="h-3.5 w-3.5 text-accent-ink" />
                      <span>Call Desk</span>
                    </a>
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="w-1/2 text-xs gap-1.5">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(s.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Directions</span>
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workshops Section */}
        <div className="space-y-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-dark text-white flex items-center justify-center">
              <Wrench className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">Authorized Service Workshops</h2>
              <p className="text-xs text-ink-soft">Equipped with automated diagnostic bays and paint booths</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workshops.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-border bg-white p-6 shadow-card flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-semibold">
                      Workshop
                    </Badge>
                    <span className="text-xs font-bold text-accent-ink bg-accent/15 px-2.5 py-0.5 rounded-pill">
                      {w.bays} Mechanical Service Bays
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink">{w.name}</h3>
                  <p className="text-xs text-ink-soft flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                    <span>{w.address}</span>
                  </p>
                  <div className="pt-2 border-t border-border/60 space-y-1 text-xs text-ink-mute">
                    <div className="flex items-center gap-1.5 font-medium text-ink">
                      <Clock className="h-3.5 w-3.5 text-accent-ink" />
                      <span>Service Hours:</span>
                    </div>
                    {Object.entries(w.hours).map(([days, time]) => (
                      <div key={days} className="flex justify-between text-[11px]">
                        <span>{days}</span>
                        <span className="font-semibold text-ink-soft">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="w-1/2 text-xs gap-1.5">
                    <a href={`tel:${w.phone.replace(/\s+/g, "")}`}>
                      <Phone className="h-3.5 w-3.5 text-accent-ink" />
                      <span>Advisor Desk</span>
                    </a>
                  </Button>
                  <Button asChild variant="primary" size="sm" className="w-1/2 text-xs gap-1.5">
                    <Link href="/book/service">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Book Service Bay</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
