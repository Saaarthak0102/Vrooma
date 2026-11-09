"use client";

import { OTP_LENGTH, sanitizeOtp } from "@/lib/auth-config";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/server/auth/actions";
import { safeNext } from "@/server/auth/safe-next";
import { postSignInPath } from "@/lib/console-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  KeyRound,
  User,
  Briefcase } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Role } from "@/types/domain";
import { PERSONA_LOGIN_TITLE, SHOW_PERSONA_LOGIN } from "@/lib/demo-mode";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "The verification link is invalid or has already been used.",
  expired_link: "This verification link has expired. Please request a new code.",
  account_disabled: "Your account has been deactivated. Please contact showroom administration.",
  exchange_failed: "Authentication exchange failed. Please request a new verification code.",
  service_unavailable: "Authentication service is temporarily unavailable. Please try again.",
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/dashboard";
  const errorParam = searchParams.get("error");
  const { switchRole } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);

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
      const res = await requestOtp(email, nextParam);
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
    const code = sanitizeOtp(codeToVerify || otpCode);
    if (code.length !== OTP_LENGTH) {
      toast.error(`Please enter the complete ${OTP_LENGTH}-digit code.`);
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

      // One rule for every sign-in route (postSignInPath): staff always land in their console, buyers keep ?next=.
      router.push(postSignInPath(res.data.role, safeNext(nextParam)));
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = sanitizeOtp(e.target.value);
    setOtpCode(val);
    if (val.length === OTP_LENGTH) {
      handleVerify(val);
    }
  };

  // Persona quick sign-in: development, or demo mode (DEMO_LOGIN=true)
  const showPersonaLogin = SHOW_PERSONA_LOGIN;
  const handleDevRole = async (role: Role) => {
    const result = await switchRole(role);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    // Full page load so middleware and server components see the new session cookies.
    const target = role === "admin" ? "/admin" : role === "consultant" || role === "manager" ? "/staff" : "/dashboard";
    window.location.assign(target);
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
              : `Enter the ${OTP_LENGTH}-digit security code sent to ${email}`}
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


            <p className="text-center text-xs text-ink-soft pt-2">
              New to Vrooma?{" "}
              <Link href={`/sign-up?next=${encodeURIComponent(nextParam)}`} className="text-accent font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        ) : (
          /* Step 2: Enter the emailed one-time code */
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-2 text-center max-w-sm mx-auto">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-mute block">
                {OTP_LENGTH}-Digit Security Code
              </label>
              <Input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={"\u2022".repeat(OTP_LENGTH)}
                value={otpCode}
                onChange={handleOtpChange}
                className="text-center font-mono text-3xl tracking-[0.3em] font-black h-14"
                autoFocus
              />
              <p className="text-[11px] text-ink-mute">
                Valid for 10 minutes. Submits automatically on the last digit.
              </p>
            </div>

            <Button
              onClick={() => handleVerify()}
              className="w-full gap-2 font-bold h-11"
              disabled={loading || otpCode.length !== OTP_LENGTH}
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

        {/* Instant persona sign-in: development, or demo mode */}
        {showPersonaLogin && (
          <div className="pt-4 border-t border-dashed border-border/80 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-mute text-center">
              {PERSONA_LOGIN_TITLE}
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
