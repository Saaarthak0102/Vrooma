"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { requestOtp, verifyOtp, startGoogle } from "@/server/auth/actions";
import { safeNext } from "@/server/auth/safe-next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Mail,
  KeyRound,
  User,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Role } from "@/types/domain";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_cancelled: "Google sign-in was cancelled. Please try again or use email code.",
  oauth_error: "Unable to complete Google sign-in. Please use email code.",
  invalid_link: "The verification link is invalid or has already been used.",
  expired_link: "This verification link has expired. Please request a new code.",
  account_disabled: "Your account has been deactivated. Please contact showroom administration.",
  exchange_failed: "Authentication exchange failed. Please request a new verification code.",
  service_unavailable: "Authentication service is temporarily unavailable. Please try again.",
};

export default function SignInPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/dashboard";
  const errorParam = searchParams.get("error");
  const { switchRole } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 2) {
      otpInputRef.current?.focus();
    }
  }, [step]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestOtp(email, locale, nextParam);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }

      toast.success("Verification code sent! Check your email inbox.");
      setStep(2);
      setResendCooldown(60);
    } catch {
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim().replace(/\D/g, "");
    if (code.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(email, code);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }

      toast.success("Signed in successfully!");

      if (!res.data.isComplete) {
        router.push(`/onboarding?next=${encodeURIComponent(nextParam)}`);
        return;
      }

      const destination = safeNext(nextParam, locale);
      router.push(destination);
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(val);
    if (val.length === 6) {
      handleVerify(val);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await startGoogle(nextParam, locale);
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

  // Dev mode role switcher (Development only)
  const isDev = process.env.NODE_ENV === "development";
  const handleDevRole = (role: Role) => {
    switchRole(role);
    if (role === "admin") router.push("/admin");
    else if (role === "consultant" || role === "manager") router.push("/staff");
    else router.push("/dashboard");
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-ink tracking-tight">
            {step === 1 ? "Sign in to Vrooma" : "Check Your Email"}
          </h1>
          <p className="text-xs text-ink-soft">
            {step === 1
              ? "Access your dashboard, manage booked demo drives, and view saved cars."
              : `Enter the 6-digit security code sent to ${email}`}
          </p>
        </div>

        {/* Error Banner from Callback / Redirect */}
        {errorParam && ERROR_MESSAGES[errorParam] && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{ERROR_MESSAGES[errorParam]}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full gap-2 font-bold h-11" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
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
              className="w-full gap-2 text-xs font-semibold h-11"
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

            <p className="text-center text-xs text-ink-soft pt-2">
              New to Vrooma?{" "}
              <Link href={`/sign-up?next=${encodeURIComponent(nextParam)}`} className="text-accent font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        ) : (
          /* Step 2: Enter 6-digit code */
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-2 text-center max-w-sm mx-auto">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-mute block">
                6-Digit Security Code
              </label>
              <Input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                value={otpCode}
                onChange={handleOtpChange}
                className="text-center font-mono text-3xl tracking-[0.3em] font-black h-14"
                maxLength={6}
                autoFocus
              />
              <p className="text-[11px] text-ink-mute">
                Valid for 10 minutes. Submits automatically on 6th digit.
              </p>
            </div>

            <Button
              onClick={() => handleVerify()}
              className="w-full gap-2 font-bold h-11"
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verify Code &amp; Sign In</span>
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-ink-soft hover:text-ink font-medium"
              >
                &larr; Change email
              </button>

              <button
                type="button"
                onClick={(e) => handleSendCode(e)}
                disabled={resendCooldown > 0 || loading}
                className="text-accent font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {/* Development-Only Role Switcher for Fast Prototyping */}
        {isDev && (
          <div className="pt-4 border-t border-dashed border-border/80 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-mute text-center">
              Dev Mode: Instant Persona Login
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px] h-8 justify-start gap-1"
                onClick={() => handleDevRole("buyer")}
              >
                <User className="h-3 w-3 text-emerald-600" />
                <span>Buyer (Aditya)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px] h-8 justify-start gap-1"
                onClick={() => handleDevRole("consultant")}
              >
                <Briefcase className="h-3 w-3 text-amber-600" />
                <span>Consultant (Rohit)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px] h-8 justify-start gap-1"
                onClick={() => handleDevRole("manager")}
              >
                <Briefcase className="h-3 w-3 text-blue-600" />
                <span>Manager (Vivek)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px] h-8 justify-start gap-1"
                onClick={() => handleDevRole("admin")}
              >
                <KeyRound className="h-3 w-3 text-accent" />
                <span>Admin (Principal)</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
