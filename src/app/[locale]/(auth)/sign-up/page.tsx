"use client";

import { CITIES, DEFAULT_CITY } from "@/lib/constants";
import { normalizeCityId } from "@/lib/cities";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { startGoogle } from "@/server/auth/actions";
import { requestSignupLink } from "@/server/auth/signup-link";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck,
  ArrowRight,
  Car,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Mail,
} from "lucide-react";

const LINK_ERRORS: Record<string, string> = {
  expired_link: "That verification link has expired or was already used. Enter your details again to get a new one.",
  invalid_link: "That verification link is invalid. Enter your details again to get a new one.",
};

export default function SignUpPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/dashboard";

  // Step management
  const [step, setStep] = useState<1 | 2>(1);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [cityId, setCityId] = useState<string>(DEFAULT_CITY.id);
  const [preferredLocale, setPreferredLocale] = useState<"en" | "hi">(locale === "hi" ? "hi" : "en");

  // Optional collapsible fields
  const [showOptional, setShowOptional] = useState(false);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");

  // Consent checkboxes (ALL strictly unticked by default per DPDP Act 2023)
  const [termsConsent, setTermsConsent] = useState(false);
  const [serviceConsent, setServiceConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // "Check your email" step
  const [resendCooldown, setResendCooldown] = useState(0);
  const { status: authStatus } = useAuth();
  const errorParam = searchParams.get("error");

  // Status
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Verification happens in the emailed link. When it is opened in this browser (another tab) the session
  // appears here via Supabase's cross-tab sync: move on to onboarding automatically.
  useEffect(() => {
    if (step === 2 && authStatus === "authenticated") {
      router.replace(`/onboarding?next=${encodeURIComponent(nextParam)}`);
    }
  }, [step, authStatus, router, nextParam]);

  // Fallback for browsers that throttle background tabs: re-check the session when the tab is focused again.
  useEffect(() => {
    if (step !== 2) return;
    const supabase = createClient();
    if (!supabase) return;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace(`/onboarding?next=${encodeURIComponent(nextParam)}`);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [step, router, nextParam]);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = "Please enter your full name (at least 2 characters).";
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    const cleanPhone = phoneDigits.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit Indian mobile number starting with 6–9.";
    }

    if (!termsConsent) {
      errs.termsConsent = "You must confirm you are 18 or older and accept the Terms & Privacy Notice.";
    }

    if (!serviceConsent) {
      errs.serviceConsent = "Consent to receive booking and enquiry communications is required.";
    }

    if (pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      errs.pincode = "Enter a valid 6-digit Indian PIN code.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!validateStep1()) {
      toast.error("Please fill in all required fields and accept mandatory notices.");
      return;
    }

    setLoading(true);
    try {
      // Save form state to sessionStorage so it survives
      sessionStorage.setItem(
        "vrooma_signup_draft",
        JSON.stringify({
          fullName,
          email,
          phone: `+91${phoneDigits.replace(/\D/g, "")}`,
          cityId,
          locale: preferredLocale,
          address,
          pincode,
        })
      );

      const res = await requestSignupLink(
        {
          email,
          fullName: fullName.trim(),
          phone: `+91${phoneDigits.replace(/\D/g, "")}`,
          cityId,
          locale: preferredLocale,
        },
        nextParam
      );

      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }

      toast.success("Verification link sent! Check your email inbox.");
      setStep(2);
      setResendCooldown(60);
    } catch {
      toast.error("Failed to send the verification link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await startGoogle(nextParam, preferredLocale);
      if (res.ok && res.data.url) {
        window.location.href = res.data.url;
      } else if (!res.ok) {
        toast.error(res.error.message);
      }
    } catch {
      toast.error("Could not initiate Google sign-in.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Brand Pillars & Benefits */}
        <div className="lg:col-span-5 space-y-6 pt-4 lg:pr-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-accent/10 border border-accent/20 text-accent font-bold text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Step {step} of 2</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
              Create your <span className="text-accent italic font-serif">Vrooma</span> account
            </h1>
            <p className="text-sm text-ink-soft leading-relaxed">
              Experience transparent automotive pricing, real-time bay availability, and guaranteed 5-minute sales response across Lucknow &amp; Kanpur.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-white shadow-xs">
              <span className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-ink shrink-0 mt-0.5">
                <Car className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-ink">Transparent On-Road Pricing</h4>
                <p className="text-[11px] text-ink-soft leading-relaxed mt-0.5">
                  Unlock exact Lucknow and Kanpur RTO tax, comprehensive insurance, and zero hidden fees on every trim.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-white shadow-xs">
              <span className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-ink shrink-0 mt-0.5">
                <Calendar className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-ink">Guaranteed Demo Drive Slots</h4>
                <p className="text-[11px] text-ink-soft leading-relaxed mt-0.5">
                  Reserve showroom appointments or home test drives with real vehicle availability without phone tag.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-white shadow-xs">
              <span className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-ink shrink-0 mt-0.5">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-ink">Track Enquiries &amp; Orders</h4>
                <p className="text-[11px] text-ink-soft leading-relaxed mt-0.5">
                  Direct connection with a dedicated product specialist committed to our 5-Minute Lead SLA.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-mute pt-2 border-t border-border">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              DPDP Act 2023 Verified
            </span>
            <span>&bull;</span>
            <span>Brand X Authorised Dealer</span>
          </div>
        </div>

        {/* Right Column: Account Creation Form */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card">
          {step === 1 && errorParam && LINK_ERRORS[errorParam] && (
            <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              {LINK_ERRORS[errorParam]}
            </div>
          )}
          {step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="pb-3 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">Personal &amp; Contact Details</h2>
                  <p className="text-xs text-ink-soft">Enter your details and we&apos;ll email you a verification link.</p>
                </div>
                <span className="text-xs font-bold text-accent">1 / 2</span>
              </div>

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

              {/* Mobile Phone with +91 chip */}
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

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                  Email Address <span className="text-accent">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-danger" : ""}
                  required
                />
                {errors.email && <p className="text-[11px] text-danger">{errors.email}</p>}
              </div>

              {/* City & Preferred Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                    City <span className="text-accent">*</span>
                  </label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CITIES[0].id}>Lucknow (UP)</SelectItem>
                      <SelectItem value={CITIES[1].id}>Kanpur (UP)</SelectItem>
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

              {/* Optional Collapsible Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline"
                >
                  {showOptional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  <span>{showOptional ? "Hide additional details" : "Add address & delivery details (optional)"}</span>
                </button>

                {showOptional && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 animate-in fade-in">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-ink-soft uppercase block">
                        Street Address (For Home Delivery / Demos)
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

              {/* DPDP Act 2023 Explicit Consent Group (All UNTICKED by default) */}
              <div className="space-y-2.5 pt-3 border-t border-border">
                {/* 1. Mandatory Terms & Privacy */}
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="consent-terms"
                    checked={termsConsent}
                    onCheckedChange={(checked) => setTermsConsent(!!checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="consent-terms" className="text-xs text-ink-soft leading-relaxed select-none cursor-pointer">
                    <span className="text-ink font-semibold">I confirm that I am 18 years or older</span> and agree to the{" "}
                    <Link href="/legal/terms" target="_blank" className="text-accent underline font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/legal/privacy" target="_blank" className="text-accent underline font-medium">
                      Privacy Policy
                    </Link>{" "}
                    under India&apos;s DPDP Act 2023. <span className="text-accent">*</span>
                  </label>
                </div>
                {errors.termsConsent && <p className="text-[11px] text-danger pl-6">{errors.termsConsent}</p>}

                {/* 2. Mandatory Transactional Communications */}
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="consent-service"
                    checked={serviceConsent}
                    onCheckedChange={(checked) => setServiceConsent(!!checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="consent-service" className="text-xs text-ink-soft leading-relaxed select-none cursor-pointer">
                    I consent to Vrooma contacting me regarding my vehicle quotations, demo drives, and service appointments via Phone, WhatsApp, SMS, and Email. <span className="text-accent">*</span>
                  </label>
                </div>
                {errors.serviceConsent && <p className="text-[11px] text-danger pl-6">{errors.serviceConsent}</p>}

                {/* 3. Optional Marketing Updates */}
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="consent-marketing"
                    checked={marketingConsent}
                    onCheckedChange={(checked) => setMarketingConsent(!!checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="consent-marketing" className="text-xs text-ink-mute leading-relaxed select-none cursor-pointer">
                    Send me seasonal festival offers, new model previews, and price revision broadcasts (Optional; can be withdrawn anytime in account settings).
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-3">
                <Button type="submit" className="w-full gap-2 font-bold" disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Link</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-border" />
                  <span className="bg-white px-3 text-[11px] uppercase font-bold text-ink-mute tracking-wider">
                    or
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full gap-2 text-xs font-semibold"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </Button>
              </div>

              <p className="text-center text-xs text-ink-soft pt-2">
                Already registered?{" "}
                <Link href={`/sign-in?next=${encodeURIComponent(nextParam)}`} className="text-accent font-semibold hover:underline">
                  Sign in here
                </Link>
              </p>
            </form>
          ) : (
            /* Step 2: check your email (verification link only) */
            <div className="space-y-6 animate-in fade-in" aria-live="polite">
              <div className="pb-3 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ink">Check your email</h2>
                  <p className="text-xs text-ink-soft">
                    We sent a verification link to <span className="font-semibold text-ink">{email}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-accent">2 / 2</span>
              </div>

              <div className="space-y-4 text-center max-w-sm mx-auto">
                <div className="h-14 w-14 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                  <Mail className="h-7 w-7" />
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Open the email and tap <span className="font-semibold text-ink">Confirm Account</span>. You can open it on
                  any device. This page continues automatically once your email is confirmed in this browser.
                </p>
                <p className="text-[11px] text-ink-mute">
                  The link works once and expires in 1 hour. Can&apos;t see it? Check your spam folder.
                </p>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-ink-soft hover:text-ink font-medium min-h-[44px]"
                  >
                    &larr; Change email or details
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSendCode(e)}
                    disabled={resendCooldown > 0 || loading}
                    className="text-accent font-semibold hover:underline disabled:opacity-50 disabled:no-underline min-h-[44px]"
                  >
                    {resendCooldown > 0 ? `Resend link (${resendCooldown}s)` : "Resend link"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

