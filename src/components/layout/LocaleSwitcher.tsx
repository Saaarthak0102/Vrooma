"use client";

import React, { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "hi" : "en";
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      disabled={isPending}
      className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-ink-soft hover:text-ink rounded-pill"
      title="Switch Language (English / हिन्दी)"
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{locale === "en" ? "हिन्दी" : "EN"}</span>
    </Button>
  );
}

