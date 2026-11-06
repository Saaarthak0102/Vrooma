"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AlertCircle } from "lucide-react";

export default function VerifyEmailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[70vh] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card text-center space-y-4" role="alert">
        <div className="h-14 w-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-ink">Couldn&apos;t load this page</h1>
        <p className="text-sm text-ink-soft">Please try again, or request a new verification link.</p>
        <Button onClick={() => reset()} className="w-full h-11 font-bold">
          Try again
        </Button>
        <Link href="/sign-up" className="block text-xs text-accent font-semibold hover:underline">
          Back to sign-up
        </Link>
      </div>
    </div>
  );
}
