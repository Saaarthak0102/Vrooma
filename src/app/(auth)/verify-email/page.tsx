"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { confirmEmailLink } from "@/server/auth/signup-link";
import { CheckCircle2, MailCheck, RefreshCw, AlertCircle } from "lucide-react";

/**
 * Landing page for the emailed verification link.
 * Verification happens on the button press, never on page load, so email scanners that open links
 * cannot consume the single-use token.
 */
function VerifyEmailInner() {
  const params = useSearchParams();
  const tokenHash = params.get("token_hash") ?? "";
  const rawType = params.get("type") ?? "";
  const next = params.get("next") ?? "/dashboard";
  const type = rawType === "signup" || rawType === "magiclink" || rawType === "email" ? rawType : null;
  const linkLooksValid = Boolean(tokenHash) && type !== null;

  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    if (loading || !type) return;
    setLoading(true);
    setFailed(null);
    try {
      const res = await confirmEmailLink({ tokenHash, type, next });
      if (!res.ok) {
        setFailed(res.error.message);
        return;
      }
      setDone(true);
      // Hard navigation so the freshly set session cookies are used by the server for the next page.
      window.location.assign(res.data.destination);
    } catch {
      setFailed("Something went wrong while confirming. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!linkLooksValid || failed) {
    return (
      <div className="space-y-4 text-center" role="alert">
        <div className="h-14 w-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-ink">This link can&apos;t be used</h1>
        <p className="text-sm text-ink-soft">
          {failed ?? "The verification link is invalid or incomplete."} Verification links work once and expire
          after an hour.
        </p>
        <Button asChild className="w-full h-11 font-bold">
          <Link href="/sign-up?error=expired_link">Get a new verification link</Link>
        </Button>
        <p className="text-xs text-ink-mute">
          Already verified?{" "}
          <Link href="/sign-in" className="text-accent font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      <div className="h-14 w-14 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
        <MailCheck className="h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold text-ink">Confirm your email</h1>
        <p className="text-sm text-ink-soft">
          One last step. Confirm to finish verifying your account, then we&apos;ll take you straight to your
          profile set-up.
        </p>
      </div>
      <Button onClick={handleConfirm} disabled={loading || done} className="w-full gap-2 font-bold h-11">
        {loading || done ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Confirming...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm my email</span>
          </>
        )}
      </Button>
      <p className="text-[11px] text-ink-mute">
        If you didn&apos;t create a Vrooma account, you can close this page.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[70vh] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-stone-100" aria-busy="true" />}>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}
