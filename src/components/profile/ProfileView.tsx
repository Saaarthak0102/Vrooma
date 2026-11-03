"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { AuthGate } from "@/components/auth/AuthGate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/PhoneField";
import { toast } from "sonner";
import { ShieldCheck, UserCheck } from "lucide-react";

export function ProfileView() {
  const { user, updateProfile, status: authStatus } = useAuth();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Sync user state into form fields
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
      setWhatsapp((user.whatsapp || user.phone || "").replace(/^\+91\s?/, "").replace(/\D/g, "").slice(0, 10));
      setAddress(user.address || "");
      setPincode((user.pincode || "").replace(/\D/g, "").slice(0, 6));
    }
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = t("nameRequired");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = t("emailInvalid");
    }

    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.whatsapp = t("whatsappInvalid");
    }

    if (!address.trim() || address.trim().length < 5) {
      newErrors.address = t("addressRequired");
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      newErrors.pincode = t("pincodeInvalid");
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
      const formattedWhatsapp = cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "";

      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        whatsapp: formattedWhatsapp,
        phone: formattedWhatsapp,
        address: address.trim(),
        pincode: pincode.trim(),
      });

      setSaveStatus("success");
      toast.success(t("updatedSuccess"));
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setSaveStatus("error");
      toast.error(t("updateError"));
      setTimeout(() => setSaveStatus("idle"), 1500);
    } finally {
      setIsSubmitting(false);
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
        <div className="max-w-2xl mx-auto">
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

              {/* 2. Email Address */}
              <FormField
                label={t("email")}
                required
                error={errors.email}
              >
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  placeholder={t("emailPlaceholder")}
                  disabled={isSubmitting}
                  className="h-11 bg-white text-sm"
                />
              </FormField>

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

              {/* 4. Address */}
              <FormField
                label={t("address")}
                required
                error={errors.address}
              >
                <Textarea
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors((prev) => ({ ...prev, address: "" }));
                  }}
                  placeholder={t("addressPlaceholder")}
                  disabled={isSubmitting}
                  rows={3}
                  className="bg-white text-sm resize-y"
                />
              </FormField>

              {/* 5. Pincode */}
              <FormField
                label={t("pincode")}
                required
                error={errors.pincode}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPincode(digits);
                    if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: "" }));
                  }}
                  placeholder={t("pincodePlaceholder")}
                  disabled={isSubmitting}
                  maxLength={6}
                  className="h-11 bg-white font-mono text-sm max-w-[200px]"
                />
              </FormField>

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
        </div>
      </AuthGate>
    </PageShell>
  );
}

