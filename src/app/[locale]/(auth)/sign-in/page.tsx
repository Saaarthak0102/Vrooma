"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Role } from "@/types/domain";
import { ShieldCheck, Mail, Sparkles, User, Briefcase, KeyRound } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function SignInPage() {
  const { signIn, switchRole, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await signIn(email, "buyer");
    setLoading(false);
    router.push("/dashboard");
  };

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
          <h1 className="text-2xl font-black text-ink tracking-tight">Sign In to Vrooma</h1>
          <p className="text-xs text-ink-soft">
            Unlock on-road pricing breakdowns, demo slots, and saved vehicles across Lucknow.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1 block">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
            <Mail className="h-4 w-4" />
            <span>{loading ? "Sending link..." : "Send Magic Link"}</span>
          </Button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-white px-3 text-xs text-ink-mute uppercase">or</span>
          <div className="border-t border-border w-full" />
        </div>

        <Button
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={notWired("Google OAuth", 4)}
        >
          <span>Continue with Google</span>
        </Button>

        {/* Dev Quick Role Switcher */}
        <div className="rounded-xl bg-ink/[0.03] border border-border p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
            <span>Dev Mode: Instant Persona Login</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Button
              variant={user?.role === "buyer" ? "primary" : "secondary"}
              size="sm"
              onClick={() => handleDevRole("buyer")}
              className="text-xs justify-start gap-1.5 h-9"
            >
              <User className="h-3.5 w-3.5" />
              <span>Buyer</span>
            </Button>
            <Button
              variant={user?.role === "consultant" ? "primary" : "secondary"}
              size="sm"
              onClick={() => handleDevRole("consultant")}
              className="text-xs justify-start gap-1.5 h-9"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Consultant</span>
            </Button>
            <Button
              variant={user?.role === "manager" ? "primary" : "secondary"}
              size="sm"
              onClick={() => handleDevRole("manager")}
              className="text-xs justify-start gap-1.5 h-9"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Manager</span>
            </Button>
            <Button
              variant={user?.role === "admin" ? "primary" : "secondary"}
              size="sm"
              onClick={() => handleDevRole("admin")}
              className="text-xs justify-start gap-1.5 h-9"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Dealer Principal</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

