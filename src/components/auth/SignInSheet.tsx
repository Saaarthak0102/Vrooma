"use client";

import React, { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useTranslations } from "next-intl";
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
import { ShieldCheck, Mail, Sparkles, User, Briefcase, KeyRound, UserPlus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export function SignInSheet() {
  const t = useTranslations("auth");
  const tProfile = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { isSignInSheetOpen, closeSignInSheet, signIn, switchRole, user } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
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
        closeSignInSheet();
      }, 500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevRoleSelect = (role: Role) => {
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
              {mode === "signup" ? t("createAccount") : t("title")}
            </SheetTitle>
          </div>
          <SheetDescription className="text-sm text-ink-soft">
            {t("subtitle")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-2">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-ink/5 rounded-pill text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`py-1.5 rounded-pill transition-colors ${
                mode === "signin" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t("title")}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`py-1.5 rounded-pill transition-colors ${
                mode === "signup" ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t("signUp")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1 block">
                    {tProfile("fullName")}
                  </label>
                  <Input
                    type="text"
                    placeholder={tProfile("fullNamePlaceholder")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1 block">
                {t("emailLabel")}
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1 block">
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
                  <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1 block">
                    {tProfile("address")}
                  </label>
                  <Input
                    type="text"
                    placeholder={tProfile("addressPlaceholder")}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1 block">
                    {tProfile("pincode")}
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={tProfile("pincodePlaceholder")}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
              status={status}
              loadingText={mode === "signup" ? tProfile("saving") : "Signing in..."}
              successText={mode === "signup" ? tProfile("saveChanges") : "Signed In!"}
              leftIcon={mode === "signup" ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            >
              {mode === "signup" ? t("createAccount") : t("sendMagicLink")}
            </Button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-white px-3 text-xs text-ink-mute uppercase">or</span>
            <div className="border-t border-border w-full" />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={notWired("Google OAuth", 4)}
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
            {t("googleSignIn")}
          </Button>

          {/* Dev Role Quick Switcher */}
          <div className="rounded-lg bg-ink/5 p-4 border border-border/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
              {t("devRoleSwitcher")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={user?.role === "buyer" ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleDevRoleSelect("buyer")}
                className="justify-start gap-1.5 text-xs h-9"
              >
                <User className="h-3.5 w-3.5" />
                {t("buyer")}
              </Button>
              <Button
                variant={user?.role === "consultant" ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleDevRoleSelect("consultant")}
                className="justify-start gap-1.5 text-xs h-9"
              >
                <Briefcase className="h-3.5 w-3.5" />
                {t("consultant")}
              </Button>
              <Button
                variant={user?.role === "manager" ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleDevRoleSelect("manager")}
                className="justify-start gap-1.5 text-xs h-9"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {t("manager")}
              </Button>
              <Button
                variant={user?.role === "admin" ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleDevRoleSelect("admin")}
                className="justify-start gap-1.5 text-xs h-9"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("admin")}
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-ink-mute text-center leading-relaxed">
            {tCommon("privacyConsent")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
