"use client";

import React, { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Car, Award, Tag, MapPin, Calculator, PhoneCall } from "lucide-react";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  const links = [
    { href: "/cars", label: tNav("cars"), icon: Car },
    { href: "/used-cars", label: tNav("usedCars"), icon: Award },
    { href: "/offers", label: tNav("offers"), icon: Tag },
    { href: "/showrooms", label: tNav("showrooms"), icon: MapPin },
    { href: "/emi-calculator", label: tNav("emi"), icon: Calculator },
  ];

  return (
    <div className="md:hidden flex items-center gap-2">
      <LocaleSwitcher />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open Navigation Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-6 flex flex-col justify-between">
          <div>
            <SheetHeader className="text-left pb-6">
              <SheetTitle className="text-xl font-bold tracking-tight">VROOMA</SheetTitle>
              <p className="text-xs text-ink-mute">Authorised Brand X Dealership</p>
            </SheetHeader>

            <nav className="space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-dark text-white font-semibold"
                        : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-border space-y-3">
            <a
              href="tel:+915224098800"
              className="flex items-center gap-2 text-xs font-medium text-ink-soft hover:text-ink"
            >
              <PhoneCall className="h-3.5 w-3.5 text-accent-ink" />
              <span>Hazratganj Desk: +91 522 409 8800</span>
            </a>
            <p className="text-[11px] text-ink-mute">
              Lucknow · Kanpur · Certified Pre-Owned
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

