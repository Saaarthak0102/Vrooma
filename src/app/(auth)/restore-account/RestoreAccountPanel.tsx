"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelAccountDeletionAction } from "@/server/actions/profile";
import { createClient } from "@/lib/supabase/client";

export function RestoreAccountPanel({ deadlineIso }: { deadlineIso: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const deadline = new Date(deadlineIso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  async function restore() {
    setBusy(true);
    try {
      const res = await cancelAccountDeletionAction();
      if (!res.ok) throw new Error(res.error.message);
      toast.success("Your account is back. Welcome back to Vrooma.");
      router.replace("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not restore the account.");
      setBusy(false);
    }
  }

  async function leave() {
    await createClient().auth.signOut();
    router.replace("/");
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-card)]">
      <h1 className="text-2xl font-semibold text-[var(--ink)]">Your account is scheduled for deletion</h1>
      <p className="mt-3 text-sm text-[var(--ink-secondary)]">
        You asked us to erase your data. Until <strong>{deadline}</strong> you can change your mind. After that your
        personal details are permanently removed and this cannot be undone.
      </p>
      <p className="mt-3 text-sm text-[var(--ink-secondary)]">
        Restoring keeps your profile and saved cars. Bookings that were cancelled and enquiries that were closed when you
        asked for erasure stay cancelled, and marketing messages stay switched off until you opt in again.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={restore} disabled={busy} className="min-h-[44px]">
          {busy ? "Restoring…" : "Restore my account"}
        </Button>
        <Button variant="outline" onClick={leave} disabled={busy} className="min-h-[44px]">
          Keep the deletion and sign out
        </Button>
      </div>
    </section>
  );
}
