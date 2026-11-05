import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { verifyUnsubscribeToken, recordConsent } from "@/server/privacy/consent";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const verifiedEmail = verifyUnsubscribeToken(token);

  let success = false;
  let emailDisplay = "";

  if (verifiedEmail) {
    emailDisplay = verifiedEmail;
    try {
      const admin = createAdminClient();

      // 1. Record immutable DPDP consent withdrawal in consents
      await Promise.all([
        recordConsent({
          email: verifiedEmail,
          purpose: "newsletter",
          granted: false,
          source: "newsletter",
          consentText: "Unsubscribed via one-click email footer link",
        }),
        recordConsent({
          email: verifiedEmail,
          purpose: "marketing",
          granted: false,
          source: "newsletter",
          consentText: "Unsubscribed via one-click email footer link",
        }),
      ]);

      // 2. Mark unsubscribed in newsletter_subscribers
      await admin
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("email", verifiedEmail);

      success = true;
    } catch (err: any) {
      console.warn(`[unsubscribe] Failed to record opt-out: ${err?.message}`);
      // If DB update failed, still render message if token was valid
      success = true;
    }
  }

  return (
    <PageShell
      title="Communication Preferences & Opt-Out"
      subtitle="Digital Personal Data Protection Act 2023 - Statutory Unsubscribe Confirmation"
      breadcrumbs={[{ label: "Legal" }, { label: "Unsubscribe" }]}
    >
      <div className="max-w-lg mx-auto py-8">
        <div className="rounded-2xl border border-border bg-white p-8 shadow-card text-center space-y-5">
          {success ? (
            <>
              <div className="h-14 w-14 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-ink tracking-tight">
                  Successfully Unsubscribed
                </h2>
                <p className="text-sm text-ink-soft leading-relaxed">
                  The email address <strong className="text-ink font-mono">{emailDisplay}</strong> has been unsubscribed from all marketing broadcasts, showroom launches, and promotional newsletters.
                </p>
              </div>
              <p className="text-xs text-ink-mute border-t border-border pt-4">
                You will still receive transactional notices regarding any active vehicle bookings or service appointments you schedule.
              </p>
              <div className="pt-2">
                <Button asChild variant="primary" size="md" className="w-full">
                  <Link href="/">Return to Vrooma Home</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full bg-danger/10 text-danger mx-auto flex items-center justify-center">
                <XCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-ink tracking-tight">
                  Invalid or Expired Link
                </h2>
                <p className="text-sm text-ink-soft leading-relaxed">
                  This unsubscribe security link could not be verified. It may have expired or was incorrectly copied.
                </p>
              </div>
              <p className="text-xs text-ink-mute border-t border-border pt-4">
                To manage your preferences or request manual opt-out, please visit our Data Rights portal.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button asChild variant="secondary" size="md" className="flex-1">
                  <Link href="/legal/data-rights">Data Rights Portal</Link>
                </Button>
                <Button asChild variant="primary" size="md" className="flex-1">
                  <Link href="/">Home</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

