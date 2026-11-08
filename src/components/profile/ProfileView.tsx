"use client";

import { MyCarsSection } from "@/components/dashboard/MyCarsSection";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { AuthGate } from "@/components/auth/AuthGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/forms/PhoneField";
import {
  updateBuyerProfileAction,
  requestEmailChangeAction,
  requestAccountDeletionAction,
} from "@/server/actions/profile";
import { toast } from "sonner";
import { ShieldCheck, UserCheck, Mail, Bell, AlertTriangle } from "lucide-react";

export function ProfileView() {
  const { user, status: authStatus, signOut } = useAuth();
  const router = useRouter();
  const t = useTranslations("profile");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Email change modal
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailDialogLoading, setEmailDialogLoading] = useState(false);

  // Deletion modal
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletionLoading, setDeletionLoading] = useState(false);

  // Sync user state into form fields
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
      setWhatsapp((user.whatsapp || user.phone || "").replace(/^\+91\s?/, "").replace(/\D/g, "").slice(0, 10));
    }
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = t("nameRequired");
    }

    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.whatsapp = t("whatsappInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      toast.error(t("updateError"));
      return;
    }

    setIsSubmitting(true);
    setSaveStatus("loading");

    try {
      const cleanPhone = whatsapp.replace(/\D/g, "");
      const formattedPhone = cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "";

      const res = await updateBuyerProfileAction({
        fullName: fullName.trim(),
        phone: formattedPhone,
        whatsapp: formattedPhone,
        marketingConsent,
        expectedUpdatedAt: user?.updated_at,
      });

      if (!res.ok) {
        throw new Error(res.error.message || t("updateError"));
      }

      setSaveStatus("success");
      toast.success(t("updatedSuccess"));
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (err: any) {
      setSaveStatus("error");
      toast.error(err?.message || t("updateError"));
      setTimeout(() => setSaveStatus("idle"), 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChangeRequest = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setEmailDialogLoading(true);
    try {
      const res = await requestEmailChangeAction(newEmail);
      if (!res.ok) {
        throw new Error(res.error.message);
      }
      toast.success(res.data.message);
      setIsEmailDialogOpen(false);
      setNewEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate email change.");
    } finally {
      setEmailDialogLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    setDeletionLoading(true);
    try {
      const res = await requestAccountDeletionAction();
      if (!res.ok) {
        throw new Error(res.error.message);
      }
      toast.success(
        "Account erasure requested. All future bookings have been cancelled. You will be signed out now."
      );
      setIsDeleteDialogOpen(false);
      await signOut(); // navigates to the landing page
    } catch (err: any) {
      toast.error(err?.message || "Failed to request account deletion.");
    } finally {
      setDeletionLoading(false);
    }
  };

  return (
    <PageShell
      title={t("title")}
      subtitle={t("subtitle")}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: t("title") },
      ]}
    >
      <AuthGate actionLabel="Sign in to view your profile">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Main Profile Card */}
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center text-accent-ink">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink tracking-tight">
                    {t("personalInfo")}
                  </h2>
                  <p className="text-xs text-ink-soft">
                    {t("subtitle")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink-soft bg-ink/5 px-2.5 py-1 rounded-pill">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-ink" />
                <span className="font-medium text-[11px]">DPDP 2023 Verified</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* 1. Full Name */}
              <FormField
                label={t("fullName")}
                required
                error={errors.fullName}
              >
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                  }}
                  placeholder={t("fullNamePlaceholder")}
                  disabled={isSubmitting}
                  className="h-11 bg-white text-sm"
                />
              </FormField>

              {/* 2. Registered Email (Account Identity & Change Trigger) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                    {t("email")} <span className="text-ink-mute">(Primary Identity)</span>
                  </label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setIsEmailDialogOpen(true)}
                    className="h-auto p-0 text-xs font-semibold text-accent-ink hover:underline"
                  >
                    Change Email
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    disabled
                    className="h-11 bg-stone-100 font-mono text-xs sm:text-sm text-ink-soft cursor-not-allowed"
                  />
                  <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
                </div>
                <p className="text-[11px] text-ink-mute">
                  To update your sign-in address, a confirmation link must be verified from the new inbox.
                </p>
              </div>

              {/* 3. WhatsApp Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                  {t("whatsapp")} <span className="text-danger">*</span>
                </label>
                <div className="relative flex rounded-md">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-ink/5 text-ink-soft text-xs font-semibold select-none">
                    +91
                  </span>
                  <Input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setWhatsapp(digits);
                      if (errors.whatsapp) setErrors((prev) => ({ ...prev, whatsapp: "" }));
                    }}
                    placeholder={t("whatsappPlaceholder")}
                    disabled={isSubmitting}
                    className="rounded-l-none font-mono text-sm h-11"
                    maxLength={10}
                  />
                </div>
                {errors.whatsapp && (
                  <p className="text-[11px] font-medium text-danger">{errors.whatsapp}</p>
                )}
              </div>

              {/* DPDP Statutory Marketing Toggle */}
              <div className="rounded-xl border border-border p-4 bg-stone-50/70 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Bell className="h-3.5 w-3.5 text-accent-ink" />
                    <span>Showroom & Festive Updates</span>
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    Receive price drop alerts, demo car slot releases, and service recalls via WhatsApp.
                  </p>
                </div>
                <Switch
                  checked={marketingConsent}
                  onCheckedChange={setMarketingConsent}
                  aria-label="Marketing communications consent"
                />
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  status={saveStatus}
                  loadingText={t("saving")}
                  successText={t("saveChanges")}
                  className="px-6 min-w-[140px]"
                >
                  {t("saveChanges")}
                </Button>
              </div>
            </form>
          </div>

          {/* DPDP Section 12 Account Erasure (Danger Zone) */}
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-danger/15 flex items-center justify-center text-danger shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-ink">Account Erasure (DPDP Act 2023)</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Under Section 12, you may request permanent erasure of your profile and contact records. Requesting erasure will immediately release upcoming appointment slots, close open vehicle enquiries, and begin a statutory 7-day cooling-off grace period.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-danger/20">
              <span className="text-[11px] text-ink-mute">
                Grace period: 7 days to cancel by logging back in.
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-xs font-semibold"
              >
                Delete My Account
              </Button>
            </div>
          </div>

          {/* Owner garage: service and insurance dates, with the reminder opt-in */}
          <MyCarsSection />
        </div>

        {/* Change Email Dialog */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Registered Email</DialogTitle>
              <DialogDescription>
                Enter your new email address. Supabase Auth will send a verification link to confirm ownership before changing your identity.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-2">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                New Email Address
              </label>
              <Input
                type="email"
                placeholder="new.email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={emailDialogLoading}
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsEmailDialogOpen(false)}
                disabled={emailDialogLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEmailChangeRequest}
                disabled={emailDialogLoading}
              >
                {emailDialogLoading ? "Sending..." : "Send Confirmation Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-danger flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Confirm Account Erasure Request
              </DialogTitle>
              <DialogDescription className="space-y-2 pt-2 text-ink-soft">
                <p>
                  Are you sure you want to delete your Vrooma buyer account?
                </p>
                <p className="text-xs bg-stone-100 p-2.5 rounded-lg border border-border">
                  • <strong>Immediate action:</strong> Any upcoming test drive or workshop service appointments will be cancelled and slots released.<br />
                  • <strong>Cooling-off:</strong> You have 7 days to cancel this request simply by logging in again.<br />
                  • <strong>After 7 days:</strong> All profile data, phone numbers, and saved wishlists will be permanently scrubbed.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deletionLoading}
              >
                Keep My Account
              </Button>
              <Button
                variant="destructive"
                onClick={handleAccountDeletion}
                disabled={deletionLoading}
              >
                {deletionLoading ? "Processing Erasure..." : "Confirm & Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AuthGate>
    </PageShell>
  );
}
