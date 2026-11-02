"use client";

import React from "react";
import { useAuth } from "./AuthProvider";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  actionLabel?: string;
  className?: string;
}

export function AuthGate({
  children,
  fallback,
  actionLabel = "Sign in to unlock",
  className,
}: AuthGateProps) {
  const { user, openSignInSheet } = useAuth();

  if (user) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className={
        className ??
        "rounded-lg border border-border bg-ink/[0.02] p-6 text-center flex flex-col items-center justify-center space-y-3"
      }
    >
      <div className="h-10 w-10 rounded-full bg-ink/5 flex items-center justify-center text-ink-mute">
        <Lock className="h-5 w-5" />
      </div>
      <p className="text-sm text-ink-soft max-w-sm">
        Sign in to view verified details, on-road tax calculations, and reserve demo slots.
      </p>
      <Button variant="primary" size="sm" onClick={() => openSignInSheet()}>
        {actionLabel}
      </Button>
    </div>
  );
}
