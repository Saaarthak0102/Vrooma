"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Car,
  DollarSign,
  Tag,
  MapPin,
  CalendarDays,
  UserCheck,
  ShieldCheck,
  Bot,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "₹2.11 Cr Leak Monitor", icon: LayoutDashboard, exact: true },
    { href: "/admin/models", label: "Model Catalog", icon: Car },
    { href: "/admin/prices", label: "Price Rules (RTO/TCS)", icon: DollarSign },
    { href: "/admin/used-cars", label: "Used Stock & AI Bands", icon: Tag },
    { href: "/admin/showrooms", label: "Showrooms & Bays", icon: MapPin },
    { href: "/admin/slots", label: "Slot Capacity", icon: CalendarDays },
    { href: "/admin/offers", label: "Offers & Banners", icon: Sparkles },
    { href: "/admin/assignment", label: "Lead Assignment", icon: UserCheck },
    { href: "/admin/users", label: "Staff & Permissions", icon: ShieldCheck },
    { href: "/admin/ai-logs", label: "AI Outbox Logs", icon: Bot },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-white/60 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="h-8 w-8 rounded-md bg-accent text-dark flex items-center justify-center font-black">
          DP
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink leading-tight">Dealer Principal</h2>
          <Badge variant="outline" className="text-[10px] py-0 px-1 mt-0.5">
            Admin Console
          </Badge>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href as any}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-dark text-white"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 pt-4 border-t border-border px-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-ink-mute hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit to Showroom</span>
        </Link>
      </div>
    </aside>
  );
}
