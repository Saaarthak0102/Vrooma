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
import { ShieldCheck, Mail, Sparkles, User, Briefcase, KeyRound } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export function SignInSheet() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const { isSignInSheetOpen, closeSignInSheet, signIn, switchRole, user } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setStatus("loading");
    try {
      await signIn(email, "buyer");
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
      <SheetContent side="auto" className="sm:max-w-md">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <SheetTitle className="text-xl font-bold">{t("title")}</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-ink-soft">
            {t("subtitle")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-2">
          {/* Quick email / phone sign-in */}
          <form onSubmit={handleMagicLink} className="space-y-3">
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
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
              status={status}
              loadingText="Signing in..."
              successText="Signed In!"
              leftIcon={<Mail className="h-4 w-4" />}
            >
              {t("sendMagicLink")}
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

