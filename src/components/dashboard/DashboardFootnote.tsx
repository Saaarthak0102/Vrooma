"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function DashboardFootnote() {
  const t = useTranslations("dashboard");

  return (
    <footer
      aria-label="Dashboard Legal Footnote"
      className="hidden min-[1100px]:flex min-h-[620px]:flex items-center justify-between text-[12px] text-ink-mute border-t border-border/80 pt-2 pb-1 px-1 shrink-0 select-none"
    >
      <span>{t("footnoteCopyright")}</span>
      <div className="flex items-center gap-3">
        <Link
          href="/legal/privacy"
          className="hover:text-ink transition-colors hover:underline underline-offset-2"
        >
          {t("footnotePrivacy")}
        </Link>
        <span className="opacity-40" aria-hidden="true">·</span>
        <Link
          href="/legal/data-rights"
          className="hover:text-ink transition-colors hover:underline underline-offset-2 font-medium text-ink-soft"
        >
          {t("footnoteDataRights")}
        </Link>
        <span className="opacity-40" aria-hidden="true">·</span>
        <Link
          href="/legal/terms"
          className="hover:text-ink transition-colors hover:underline underline-offset-2"
        >
          {t("footnoteTerms")}
        </Link>
      </div>
    </footer>
  );
}

