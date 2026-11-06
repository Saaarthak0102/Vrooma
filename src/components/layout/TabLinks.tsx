import React from "react";
import Link from "next/link";

export interface TabLinkItem {
  id: string;
  label: string;
}

/** Server-rendered tab strip driven by `?tab=`. Each tab is a real link, so it is shareable and back-button safe. */
export function TabLinks({
  base,
  tabs,
  active,
}: {
  base: string;
  tabs: TabLinkItem[];
  active: string;
}) {
  return (
    <nav aria-label="Sections" className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={`${base}?tab=${tab.id}` as any}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex h-11 items-center rounded-md px-4 text-xs font-bold transition-colors ${
              isActive ? "bg-dark text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Picks a valid tab from the raw query value, defaulting to the first. */
export function pickTab(raw: string | string[] | undefined, tabs: TabLinkItem[]): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return tabs.some((t) => t.id === value) ? (value as string) : tabs[0].id;
}
