"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <Container className="max-w-md text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-ink">Something went wrong</h2>
        <p className="text-sm text-ink-soft">
          We encountered an unexpected error while loading this page. Our team has been notified.
        </p>
        <div className="pt-2">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
        </div>
      </Container>
    </div>
  );
}
