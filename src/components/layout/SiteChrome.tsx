"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SheenBackground } from "@/components/layout/SheenBackground";

/** Staff and admin consoles bring their own top bar. They get no public header, footer, chat or backdrop. */
export function isConsolePath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && /^\/(staff|admin)(\/|$)/.test(pathname));
}

/**
 * The public site chrome (header, footer, chat widget, sheen backdrop) around page content.
 * Every non-console route renders exactly what it did before; console routes render only their content.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isConsolePath(pathname)) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <SheenBackground />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
