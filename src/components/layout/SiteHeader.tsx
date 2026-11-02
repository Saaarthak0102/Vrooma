"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { UserMenu } from "@/components/auth/UserMenu";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import Image from "next/image";

export function SiteHeader() {
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  const navLinks = [
    { href: "/cars", label: tNav("cars") },
    { href: "/used-cars", label: tNav("usedCars") },
    { href: "/offers", label: tNav("offers") },
    { href: "/showrooms", label: tNav("showrooms") },
    { href: "/emi-calculator", label: tNav("emi") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full pt-3 pb-2 px-3 sm:px-6">
      <Container className="p-0">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 rounded-pill glass-panel shadow-sm">
          {/* Brand mark */}
          <Link href="/" className="flex items-center gap-2.5 group">
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
            <span className="font-bold tracking-tight text-lg text-ink group-hover:text-accent-ink transition-colors">
              VROOMA
            </span>
          </Link>

          {/* Center Glass Pill Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-ink/5 p-1 rounded-pill">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href as any}
                  className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold tracking-wide transition-all ${
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

          {/* Right Action Icons: Locale + UserMenu */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>
            <UserMenu />
            <MobileNav />
          </div>
        </div>
      </Container>
    </header>
  );
}
