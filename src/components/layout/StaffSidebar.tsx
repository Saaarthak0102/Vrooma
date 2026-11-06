"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  FileSpreadsheet,
  Calendar,
  Clock,
  ArrowLeft,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StaffSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/staff", label: "SLA Overview", icon: Clock, exact: true },
    { href: "/staff/leads", label: "Lead Inbox", icon: Inbox },
    { href: "/staff/leads/import", label: "CSV Import", icon: FileSpreadsheet },
    { href: "/staff/bookings", label: "Scheduled Demos", icon: Calendar },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-white/50 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="h-8 w-8 rounded-md bg-dark text-white flex items-center justify-center">
          <Briefcase className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink leading-tight">Lead Desk</h2>
          <Badge variant="accent" className="text-[10px] py-0 px-1 mt-0.5">
            5-Min SLA
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

