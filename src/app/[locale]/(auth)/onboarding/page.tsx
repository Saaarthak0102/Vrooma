"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";
import { completeProfile, signOut } from "@/server/auth/actions";
import { safeNext } from "@/server/auth/safe-next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  LogOut,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/dashboard";
  const { user, status } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [cityId, setCityId] = useState("city-lucknow");
  const [preferredLocale, setPreferredLocale] = useState<"en" | "hi">(locale === "hi" ? "hi" : "en");

  // Optional fields
  const [showOptional, setShowOptional] = useState(false);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");

  // DPDP Consents
  const [termsConsent, setTermsConsent] = useState(false);
  const [serviceConsent, setServiceConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate from authenticated user profile or sessionStorage draft
  useEffect(() => {
    if (user) {
      if (user.full_name) setFullName(user.full_name);
      if (user.email) setEmail(user.email);
      if (user.phone) {
        const clean = user.phone.replace(/\D/g, "");
        setPhoneDigits(clean.startsWith("91") ? clean.slice(2) : clean);
      }
      if (user.city_id) setCityId(user.city_id);
      if (user.address) setAddress(user.address);
      if (user.pincode) setPincode(user.pincode);
    }

    // Check draft in sessionStorage if available
    try {
      const draft = sessionStorage.getItem("vrooma_signup_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) {
          const clean = parsed.phone.replace(/\D/g, "");
          setPhoneDigits(clean.startsWith("91") ? clean.slice(2) : clean);
        }
        if (parsed.cityId) setCityId(parsed.cityId);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.pincode) setPincode(parsed.pincode);
        if (parsed.termsConsent) setTermsConsent(parsed.termsConsent);
        if (parsed.serviceConsent) setServiceConsent(parsed.serviceConsent);
        if (parsed.marketingConsent) setMarketingConsent(parsed.marketingConsent);
      }
    } catch {}
  }, [user]);

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = "Please enter your full name (at least 2 characters).";
    }

    const cleanPhone = phoneDigits.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit Indian mobile number starting with 6–9.";
    }

    if (!termsConsent) {
      errs.termsConsent = "You must confirm you are 18 or older and accept the Terms & Privacy Notice.";
    }

    if (!serviceConsent) {
      errs.serviceConsent = "Consent to receive booking and quotation communications is required.";
    }

    if (pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      errs.pincode = "Enter a valid 6-digit Indian PIN code.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!validate()) {
      toast.error("Please fill in all required fields and accept mandatory notices.");
      return;
    }

    setLoading(true);
    try {
      const res = await completeProfile({
        full_name: fullName.trim(),
        email: email || user?.email || "buyer@vrooma.in",
        phone: `+91${phoneDigits.replace(/\D/g, "")}`,
        city_id: cityId,
        locale: preferredLocale,
        address: address.trim() || undefined,
        pincode: pincode.trim() || undefined,
        terms_consent: true,
        service_consent: true,
        marketing_consent: marketingConsent,
      });

      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }

      sessionStorage.removeItem("vrooma_signup_draft");
      toast.success("Profile completed! Welcome to Vrooma.");
      const destination = safeNext(nextParam, preferredLocale);
      router.push(destination);
    } catch {
      toast.error("Failed to complete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <div className="min-h-[80vh] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-accent/10 text-accent font-bold text-[11px]">
              <Sparkles className="h-3 w-3" />
              <span>One-Time Onboarding</span>
            </span>
            <h1 className="text-2xl font-black text-ink tracking-tight">
              Complete Your Customer Profile
            </h1>
            <p className="text-xs text-ink-soft">
              Under India&apos;s DPDP Act 2023, vehicle quotations and test drive slots require confirmed contact details and verified consent.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-ink-mute hover:text-danger gap-1 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>

        <form onSubmit={handleComplete} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
              Full Name <span className="text-accent">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Aditya Mishra"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={errors.fullName ? "border-danger" : ""}
              required
            />
            {errors.fullName && <p className="text-[11px] text-danger">{errors.fullName}</p>}
          </div>

          {/* Email Address (Account Identity) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
              Registered Email (Account Identity)
            </label>
            <Input
              type="email"
              value={email || user?.email || ""}
              disabled
              className="bg-ink/5 text-ink-mute"
            />
          </div>

          {/* Mobile Phone */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
              Mobile Number (India) <span className="text-accent">*</span>
            </label>
            <div className="relative flex rounded-md">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-ink/5 text-ink text-xs font-bold select-none">
                +91
              </span>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className={`rounded-l-none font-mono ${errors.phone ? "border-danger" : ""}`}
                maxLength={10}
                required
              />
            </div>
            {errors.phone && <p className="text-[11px] text-danger">{errors.phone}</p>}
          </div>

          {/* City & Preferred Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                Primary Showroom City <span className="text-accent">*</span>
              </label>
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city-lucknow">Lucknow (UP)</SelectItem>
                  <SelectItem value="city-kanpur">Kanpur (UP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                Language Preference
              </label>
              <Select
                value={preferredLocale}
                onValueChange={(val) => setPreferredLocale(val as "en" | "hi")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collapsible Optional Address */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline"
            >
              {showOptional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span>{showOptional ? "Hide optional delivery details" : "Add home delivery address (optional)"}</span>
            </button>

            {showOptional && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 animate-in fade-in">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-ink-soft uppercase block">
                    Street Address (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="14/A, MG Marg, Hazratganj"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ink-soft uppercase block">
                    PIN Code
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="226001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                  {errors.pincode && <p className="text-[10px] text-danger">{errors.pincode}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Consents Group */}
          <div className="space-y-2.5 pt-3 border-t border-border">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="onboard-terms"
                checked={termsConsent}
                onCheckedChange={(c) => setTermsConsent(!!c)}
                className="mt-0.5"
              />
              <label htmlFor="onboard-terms" className="text-xs text-ink-soft leading-relaxed select-none cursor-pointer">
                <span className="text-ink font-semibold">I confirm that I am 18 years or older</span> and agree to the{" "}
                <Link href="/legal/terms" target="_blank" className="text-accent underline font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" target="_blank" className="text-accent underline font-medium">
                  Privacy Policy
                </Link>{" "}
                under DPDP Act 2023. <span className="text-accent">*</span>
              </label>
            </div>
            {errors.termsConsent && <p className="text-[11px] text-danger pl-6">{errors.termsConsent}</p>}

            <div className="flex items-start gap-2.5">
              <Checkbox
                id="onboard-service"
                checked={serviceConsent}
                onCheckedChange={(c) => setServiceConsent(!!c)}
                className="mt-0.5"
              />
              <label htmlFor="onboard-service" className="text-xs text-ink-soft leading-relaxed select-none cursor-pointer">
                I consent to Vrooma contacting me regarding quotations, test drive scheduling, and service reminders via Phone, WhatsApp, SMS, and Email. <span className="text-accent">*</span>
              </label>
            </div>
            {errors.serviceConsent && <p className="text-[11px] text-danger pl-6">{errors.serviceConsent}</p>}

            <div className="flex items-start gap-2.5">
              <Checkbox
                id="onboard-marketing"
                checked={marketingConsent}
                onCheckedChange={(c) => setMarketingConsent(!!c)}
                className="mt-0.5"
              />
              <label htmlFor="onboard-marketing" className="text-xs text-ink-mute leading-relaxed select-none cursor-pointer">
                Send me festival discount benefits and new model launch previews (Optional).
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2 font-bold h-11" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Complete Profile &amp; Continue</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

