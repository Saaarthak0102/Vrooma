"use client";

import { OTP_LENGTH, sanitizeOtp } from "@/lib/auth-config";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Role } from "@/types/domain";
import { requestOtp, verifyOtp, startGoogle } from "@/server/auth/actions";
import { ShieldCheck, Mail, ArrowRight, CheckCircle2, RefreshCw, User, Briefcase, KeyRound } from "lucide-react";
import { toast } from "sonner";

export function SignInSheet() {
  const router = useRouter();
  const { isSignInSheetOpen, closeSignInSheet, completeSignIn, switchRole } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (!isSignInSheetOpen) {
      setStep(1);
      setEmail("");
      setOtpCode("");
      setResendCooldown(0);
    }
  }, [isSignInSheetOpen]);

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
      const res = await requestOtp(email);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }

      toast.success("Verification code sent to your email.");
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
        // Profile not finished: go to onboarding and drop the action that needed sign-in.
        await completeSignIn({ runPending: false });
        router.push("/onboarding");
      } else {
        // Reload the session, close the sheet and resume what the user was doing (e.g. Save, Confirm booking).
        await completeSignIn();
      }
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await startGoogle("/dashboard");
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

  // Dev persona quick-login
  const isDev = process.env.NODE_ENV === "development";
  const handleDevRole = (role: Role) => {
    switchRole(role);
    closeSignInSheet();
  };

  return (
    <Sheet open={isSignInSheetOpen} onOpenChange={(open) => !open && closeSignInSheet()}>
      <SheetContent side="auto" className="sm:max-w-md overflow-y-auto max-h-screen">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <SheetTitle className="text-xl font-bold">
              {step === 1 ? "Sign In to Vrooma" : "Enter Verification Code"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-ink-soft">
            {step === 1
              ? "Sign in with passwordless email OTP to unlock full on-road breakups and booked test drives."
              : `A ${OTP_LENGTH}-digit code was sent to ${email}.`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-3.5">
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

              <Button type="submit" className="w-full gap-2 font-bold h-10" disabled={loading}>
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

              <div className="relative flex items-center justify-center my-3">
                <div className="w-full border-t border-border" />
                <span className="bg-white px-2.5 text-[10px] uppercase font-bold text-ink-mute tracking-wider">
                  or
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full gap-2 text-xs font-semibold h-10"
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

              <div className="pt-2 text-center text-xs text-ink-soft">
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  onClick={() => closeSignInSheet()}
                  className="text-accent font-semibold hover:underline"
                >
                  Create account
                </Link>
              </div>
            </form>
          ) : (
            /* Step 2: Code input */
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2 text-center">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-mute block">
                  {OTP_LENGTH}-Digit Verification Code
                </label>
                <Input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                  value={otpCode}
                  onChange={handleOtpChange}
                  className="text-center font-mono text-2xl tracking-[0.25em] font-black h-12"
                  autoFocus
                />
              </div>

              <Button
                onClick={() => handleVerify()}
                className="w-full gap-2 font-bold h-10"
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
                    <span>Verify &amp; Continue</span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
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

          {/* Dev persona quick-switcher */}
          {isDev && (
            <div className="pt-3 border-t border-dashed border-border/80 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-mute text-center">
                Dev Mode: Persona Switcher
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 justify-start gap-1"
                  onClick={() => handleDevRole("buyer")}
                >
                  <User className="h-3 w-3 text-emerald-600" />
                  <span>Buyer</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 justify-start gap-1"
                  onClick={() => handleDevRole("consultant")}
                >
                  <Briefcase className="h-3 w-3 text-amber-600" />
                  <span>Consultant</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 justify-start gap-1"
                  onClick={() => handleDevRole("manager")}
                >
                  <Briefcase className="h-3 w-3 text-blue-600" />
                  <span>Manager</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 justify-start gap-1"
                  onClick={() => handleDevRole("admin")}
                >
                  <KeyRound className="h-3 w-3 text-accent" />
                  <span>Admin</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
