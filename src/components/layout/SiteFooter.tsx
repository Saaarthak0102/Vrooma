"use client";

import React, { useState, useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { PillButton } from "@/components/ui/PillButton";
import { Checkbox } from "@/components/ui/checkbox";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/register";
import { PIN_QUERY, REDUCED_QUERY } from "@/lib/motion/media";

export function SiteFooter() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const footerRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const footer = footerRef.current;
      const wordmark = wordmarkRef.current;
      if (!footer || !wordmark) return;

      const mm = gsap.matchMedia();

      // Under reduced motion: always show final state immediately
      mm.add(REDUCED_QUERY, () => {
        gsap.set(wordmark, { yPercent: 0, opacity: 1 });
      });

      // Under mobile/tablet viewports (< 1024px): show final state immediately without scroll lag
      mm.add("(max-width: 1023px)", () => {
        gsap.set(wordmark, { yPercent: 0, opacity: 1 });
      });

      // Desktop layout with no reduced motion
      mm.add(PIN_QUERY, () => {
        const rect = footer.getBoundingClientRect();
        const isAlreadyInView = rect.top <= window.innerHeight;
        const isScrollable = document.documentElement.scrollHeight > window.innerHeight + 80;

        if (isAlreadyInView && !isScrollable) {
          // Short page where footer is already fully on screen at load
          gsap.set(wordmark, { yPercent: 0, opacity: 1 });
        } else {
          // Normal/long page: scroll-linked rise
          gsap.fromTo(
            wordmark,
            {
              yPercent: 45,
              opacity: 0,
            },
            {
              yPercent: 0,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: footer,
                start: "top bottom",
                end: "bottom bottom",
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            }
          );
        }
      });

      // Recalculate ScrollTrigger on route transitions
      ScrollTrigger.refresh();

      return () => mm.revert();
    },
    { scope: footerRef, dependencies: [pathname] }
  );

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please provide explicit consent to receive showroom updates.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
      return;
    }

    setLoading(true);
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Subscription failed");
      }
      toast.success(data.message || "Subscribed successfully!");
      setEmail("");
      setConsent(false);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 1400);
    } catch (err: any) {
      toast.error(err.message || "Could not subscribe. Please try again.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer
      ref={footerRef}
      className="mt-20 border-t border-border bg-[#E3E6EB] relative overflow-hidden text-ink"
    >
      <Container data-layout="footer:content" data-layout-kind="card" className="pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Newsletter & DPDP Consent */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-black tracking-tight text-ink">VROOMA</span>
            </Link>
            <p className="text-sm text-ink-soft max-w-sm leading-relaxed">
              Authorised Brand X dealership in Lucknow & Kanpur. Delivering guaranteed price transparency, 140-point certified used vehicles, and real-time appointment bookings.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3 pt-2 max-w-md">
              <label
                htmlFor="footer-email-input"
                className="text-xs font-bold uppercase tracking-wider text-ink block"
              >
                Join our newsletter for new arrivals and offers.
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="footer-email-input"
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-11 rounded-pill bg-white/90 border border-border px-4 text-base sm:text-xs text-ink placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <PillButton
                  type="submit"
                  disabled={loading}
                  status={status}
                  loadingText="Subscribing..."
                  successText="Subscribed!"
                  variant="primary"
                  className="h-11 px-6 text-xs whitespace-nowrap"
                >
                  Subscribe
                </PillButton>
              </div>

              {/* UNTICKED consent checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <Checkbox
                  id="newsletter-consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(!!checked)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="newsletter-consent"
                  className="text-[11px] text-ink-soft leading-tight cursor-pointer select-none"
                >
                  I agree to receive updates. I can opt out any time per Vrooma Privacy Policy under DPDP Act 2023.
                </label>
              </div>
            </form>
          </div>

          {/* Right Columns: Cars, Services, Company, Legal */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {/* Cars */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Cars</h4>
              <ul className="space-y-2 text-xs text-ink-soft">
                <li>
                  <Link href="/cars" className="hover:text-ink transition-colors">
                    New cars
                  </Link>
                </li>
                <li>
                  <Link href="/used-cars" className="hover:text-ink transition-colors">
                    Used cars
                  </Link>
                </li>
                <li>
                  <Link href="/offers" className="hover:text-ink transition-colors">
                    Offers
                  </Link>
                </li>
                <li>
                  <Link href="/emi-calculator" className="hover:text-ink transition-colors">
                    EMI calculator
                  </Link>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Services</h4>
              <ul className="space-y-2 text-xs text-ink-soft">
                <li>
                  <Link href="/book/test-drive" className="hover:text-ink transition-colors">
                    Test drive
                  </Link>
                </li>
                <li>
                  <Link href="/book/service" className="hover:text-ink transition-colors">
                    Service booking
                  </Link>
                </li>
                <li>
                  <Link href="/trade-in" className="hover:text-ink transition-colors">
                    Trade-in
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Company</h4>
              <ul className="space-y-2 text-xs text-ink-soft">
                <li>
                  <Link href="/about" className="hover:text-ink transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/showrooms" className="hover:text-ink transition-colors">
                    Showrooms
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-ink transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Legal</h4>
              <ul className="space-y-2 text-xs text-ink-soft">
                <li>
                  <Link href="/legal/privacy" className="hover:text-ink transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/terms" className="hover:text-ink transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/legal/data-rights" className="hover:text-ink transition-colors">
                    Data rights
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar with locale toggle */}
        <div className="pt-12 mt-8 border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-mute">
          <p>© {new Date().getFullYear()} Vrooma Automobiles Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-ink-soft">Language:</span>
            <LocaleSwitcher />
          </div>
        </div>
      </Container>

      {/* Giant Scrubbed Vrooma Wordmark (Instrument Serif italic, sits behind links with lower z-index and 24px bottom padding) */}
      <div
        ref={wordmarkRef}
        data-layout="footer:wordmark"
        data-layout-kind="text"
        aria-hidden="true"
        className="pointer-events-none select-none text-center font-serif italic font-normal tracking-tight text-white/55 leading-none whitespace-nowrap overflow-hidden relative z-0 pb-6"
        style={{
          fontSize: "clamp(4.5rem, 24vw, 24rem)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
        }}
      >
        Vrooma
      </div>
    </footer>
  );
}
