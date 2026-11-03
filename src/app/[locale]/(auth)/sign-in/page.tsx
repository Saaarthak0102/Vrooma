"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Role } from "@/types/domain";
import { ShieldCheck, Mail, Sparkles, User, Briefcase, KeyRound, UserPlus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";
import { useTranslations } from "next-intl";

export default function SignInPage() {
  const { signIn, switchRole, user } = useAuth();
  const router = useRouter();
  const tAuth = useTranslations("auth");
  const tProfile = useTranslations("profile");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setStatus("loading");
    try {
      if (mode === "signup") {
        const cleanPhone = whatsapp.replace(/\D/g, "");
        const formattedWhatsapp = cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "+91 98765 00001";
        await signIn(email, "buyer", {
          full_name: fullName.trim() || email.split("@")[0],
          email: email.trim(),
          whatsapp: formattedWhatsapp,
          phone: formattedWhatsapp,
          address: address.trim() || "14/A, MG Marg, Hazratganj, Lucknow",
          pincode: pincode.trim() || "226001",
        });
      } else {
        await signIn(email, "buyer");
      }
      setStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-black text-ink tracking-tight">
            {mode === "signup" ? tAuth("createAccount") : tAuth("title")}
          </h1>
          <p className="text-xs text-ink-soft">
            {tAuth("subtitle")}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-ink/5 rounded-pill text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`py-1.5 rounded-pill transition-colors ${
              mode === "signin" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tAuth("title")}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`py-1.5 rounded-pill transition-colors ${
              mode === "signup" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tAuth("signUp")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1 block">
                {tProfile("fullName")}
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={tProfile("fullNamePlaceholder")}
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1 block">
              {tAuth("emailLabel")}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1 block">
                  {tProfile("whatsapp")}
                </label>
                <div className="relative flex rounded-md">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-ink/5 text-ink-soft text-xs font-semibold select-none">
                    +91
                  </span>
                  <Input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={tProfile("whatsappPlaceholder")}
                    className="rounded-l-none font-mono"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1 block">
                  {tProfile("address")}
                </label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={tProfile("addressPlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1 block">
                  {tProfile("pincode")}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={tProfile("pincodePlaceholder")}
                  maxLength={6}
                  required
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full h-11 gap-2"
            disabled={loading}
            status={status}
            loadingText={mode === "signup" ? tProfile("saving") : "Sending link..."}
            successText={mode === "signup" ? tProfile("saveChanges") : "Link Sent!"}
            leftIcon={mode === "signup" ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          >
            {mode === "signup" ? tAuth("createAccount") : tAuth("sendMagicLink")}
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
