"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { linksForRole, ROLE_LABEL } from "@/lib/console-nav";
import type { Role } from "@/types/domain";

/**
 * One shell for every non-buyer role: a slim top bar with the role's 2-3 screens, the signed-in person and
 * sign-out. Replaces the separate staff/admin sidebars (which showed links that returned 403).
 */
export function ConsoleShell({
  role,
  name,
  children,
}: {
  role: Role;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const links = linksForRole(role);

  // Touch-size rules (src/styles/console.css) apply only while a console is open, and reach portaled panels.
  useEffect(() => {
    document.body.classList.add("console-touch");
    return () => document.body.classList.remove("console-touch");
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface-glass backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
          <Link
            href="/"
            aria-label="Back to the showroom website"
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-xs font-semibold text-ink-mute hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Showroom</span>
          </Link>

          <nav aria-label="Console" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {links.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href as any}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-11 shrink-0 items-center rounded-md px-3 text-xs font-bold transition-colors ${
                    active ? "bg-dark text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-xs font-bold text-ink">{name}</p>
              <p className="text-[10px] text-ink-mute">{ROLE_LABEL[role]}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink hover:bg-ink/5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}
