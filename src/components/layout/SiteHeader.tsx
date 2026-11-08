"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { UserMenu } from "@/components/auth/UserMenu";
import { PillButton } from "@/components/ui/PillButton";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { stopLenis, startLenis } from "@/components/motion/SmoothScrollProvider";

// Same glass look for all three header groups (brand, links, actions) once the page is scrolled.
const GLASS_BASE = "rounded-pill transition-[background,border-color,box-shadow] duration-250";
const GLASS_SCROLLED = "bg-white/70 border border-border shadow-card backdrop-blur-[10px]";
const GLASS_TOP = "bg-transparent border border-transparent shadow-none";

export function SiteHeader() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sentinel-based scroll detection at 40px (NO scroll listeners)
    const sentinel = document.getElementById("header-scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is intersecting, user is within the top 40px
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      stopLenis();
      // Trap focus or prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      startLenis();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/cars", label: tNav("cars") },
    { href: "/used-cars", label: tNav("usedCars") },
    { href: "/offers", label: tNav("offers") },
    { href: "/showrooms", label: tNav("showrooms") },
    { href: "/emi-calculator", label: tNav("emi") },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full pt-3 pb-2" style={{ paddingInline: "var(--gutter)" }}>
        <Container className="p-0">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            {/* Left: Brand mark + Vrooma wordmark */}
            <div
              className={`flex items-center h-11 px-3 ${GLASS_BASE} ${isScrolled ? GLASS_SCROLLED : GLASS_TOP}`}
            >
              <Link href="/" className="flex h-full items-center gap-2.5 group">
                <div className="h-8 w-8 relative overflow-hidden rounded-md bg-dark flex items-center justify-center p-1">
                  <Image
                    src="/images/placeholders/logo-mark.svg"
                    alt="Vrooma"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="font-bold tracking-tight text-lg text-ink">
                  VROOMA
                </span>
              </Link>
            </div>

            {/* Centre: Nav items (Becomes glass pill after 40px) */}
            <nav
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-pill transition-[background,border-color,box-shadow] duration-250 ${
                isScrolled
                  ? "bg-white/70 border border-border shadow-card backdrop-blur-[10px]"
                  : "bg-transparent border border-transparent shadow-none"
              }`}
            >
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href as any}
                    className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold tracking-wide transition-colors ${
                      isActive
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-soft hover:text-ink hover:bg-white/40"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: UserMenu, Dark Pill CTA */}
            <div
              className={`flex items-center h-[42px] gap-2 px-2 ${GLASS_BASE} ${isScrolled ? GLASS_SCROLLED : GLASS_TOP}`}
            >
              <div className="flex items-center">
                <UserMenu />
              </div>

              <div className="hidden lg:flex items-center">
                <PillButton asChild variant="primary" showArrow className="h-10 text-xs px-4">
                  <Link href="/book/test-drive">{tCommon("bookTestDrive")}</Link>
                </PillButton>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center md:hidden">
                <Button
                  variant="secondary"
                  size="icon"
                  shape="pill"
                  onClick={() => setMobileMenuOpen(true)}
                  className="h-10 w-10 bg-white/80 border border-border shadow-sm text-ink"
                  aria-label="Open navigation menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* Mobile Navigation Sheet */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-6 border-b border-border">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center gap-2.5"
            >
              <div className="h-8 w-8 relative overflow-hidden rounded-md bg-dark flex items-center justify-center p-1">
                <Image
                  src="/images/placeholders/logo-mark.svg"
                  alt="Vrooma"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="font-bold tracking-tight text-lg text-ink">
                VROOMA
              </span>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              shape="pill"
              onClick={() => setMobileMenuOpen(false)}
              className="h-10 w-10 rounded-pill bg-ink/5 text-ink hover:bg-ink/10 transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex flex-col gap-4 py-8 flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href as any}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-semibold tracking-tight text-ink hover:text-accent-ink transition-colors py-2"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-border flex flex-col gap-4">
            <PillButton asChild variant="primary" showArrow className="w-full justify-between h-12">
              <Link
                href="/book/test-drive"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{tCommon("bookTestDrive")}</span>
              </Link>
            </PillButton>
          </div>
        </div>
      )}
    </>
  );
}
