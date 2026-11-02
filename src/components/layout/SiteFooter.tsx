"use client";

import React, { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MapPin, Phone, ShieldCheck, ArrowRight } from "lucide-react";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function SiteFooter() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please agree to the privacy consent under DPDP Act 2023");
      return;
    }
    toast.success("Subscribed successfully! You will receive verified showroom updates.");
    setEmail("");
    setConsent(false);
  };

  return (
    <footer className="mt-24 border-t border-border bg-surface/80 relative overflow-hidden">
      {/* Giant Faded Wordmark Background */}
      <div
        aria-hidden="true"
        className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 select-none pointer-events-none opacity-[0.03] text-[18vw] font-black tracking-tighter text-ink leading-none whitespace-nowrap"
      >
        VROOMA
      </div>

      <Container className="py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand Info & Newsletter */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-black tracking-tight text-ink">VROOMA</span>
            </Link>
            <p className="text-sm text-ink-soft max-w-sm leading-relaxed">
              Official authorised dealership for Brand X in Lucknow. Offering transparent on-road price breakups, guaranteed 140-point certified used vehicles, and real-time test drive slots.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3 pt-2 max-w-sm">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Showroom Newsletter & Stock Alerts
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/80 h-10"
                  required
                />
                <Button type="submit" size="sm" className="gap-1 h-10 px-4">
                  <span>Join</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="footer-consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(!!checked)}
                />
                <label
                  htmlFor="footer-consent"
                  className="text-[11px] text-ink-mute leading-tight cursor-pointer"
                >
                  {tCommon("privacyConsent")}
                </label>
              </div>
            </form>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Vehicles</h4>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li>
                <Link href="/cars" className="hover:text-ink transition-colors">
                  {tNav("cars")}
                </Link>
              </li>
              <li>
                <Link href="/used-cars" className="hover:text-ink transition-colors">
                  {tNav("usedCars")}
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-ink transition-colors">
                  {tNav("offers")}
                </Link>
              </li>
              <li>
                <Link href="/emi-calculator" className="hover:text-ink transition-colors">
                  {tNav("emi")}
                </Link>
              </li>
              <li>
                <Link href="/trade-in" className="hover:text-ink transition-colors">
                  {tNav("tradeIn")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Showrooms & Service */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Lucknow Centers</h4>
            <div className="space-y-2.5 text-xs text-ink-soft">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Hazratganj Flagship</p>
                  <p className="text-ink-mute">14/A MG Marg · Tel: 0522 409 8800</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Gomti Nagar Experience Center</p>
                  <p className="text-ink-mute">Vibhuti Khand · Tel: 0522 419 9900</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Transport Nagar Central Workshop</p>
                  <p className="text-ink-mute">16 Service Bays · Tel: 0522 450 1122</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Compliance</h4>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li>
                <Link href="/legal/privacy" className="hover:text-ink transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-ink transition-colors">
                  Terms of Sale
                </Link>
              </li>
              <li>
                <Link href="/legal/data-rights" className="hover:text-ink transition-colors font-medium text-accent-ink">
                  Data Rights (DPDP)
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-ink transition-colors">
                  About Dealership
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-ink transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-mute">
          <p>© {new Date().getFullYear()} Vrooma Automobiles Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-accent-ink">
              <ShieldCheck className="h-3.5 w-3.5" />
              DPDP Act 2023 Compliant
            </span>
            <LocaleSwitcher />
          </div>
        </div>
      </Container>
    </footer>
  );
}
