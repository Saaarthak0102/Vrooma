"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTranslations } from "next-intl";

export function DashboardGreeting() {
  const { user } = useAuth();
  const t = useTranslations("dashboard");
  const firstName = user?.full_name?.split(" ")[0] || "Motorist";

  return (
    <div className="shrink-0 mb-1">
      <h1 className="greeting-title font-bold text-ink tracking-tight">
        {t("welcome")}, {firstName}
      </h1>
      <p className="greeting-subtitle text-xs sm:text-sm text-ink-soft line-clamp-1 mt-0.5">
        {t("subtitle")}
      </p>
    </div>
  );
}

