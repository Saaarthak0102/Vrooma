"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/phone";
import { safeNext } from "./safe-next";
import { resolvePostVerifyDestination } from "./post-verify";
import { ActionResponse, successResponse, errorResponse, toAppError } from "@/lib/errors";
import { env } from "@/lib/env";

/**
 * Link-only sign-up.
 *
 * 1. requestSignupLink  -> Supabase emails a confirmation LINK (no code is shown or accepted for sign-up).
 * 2. The link lands on /auth/confirm, which forwards to /verify-email (a page with a button, so
 *    email scanners that auto-open links cannot burn the single-use token).
 * 3. confirmEmailLink   -> verifies the token and returns where to go: /onboarding for every new account.
 * 4. getSignupHint      -> prefill for onboarding. user_metadata is user-editable, so it is used ONLY to
 *                          prefill fields, never for role or consent.
 */

const signupLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().transform((v, ctx) => {
    const normalized = normalizeIndianPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid 10-digit Indian mobile number." });
      return z.NEVER;
    }
    return normalized;
  }),
  cityId: z.string().trim().max(40).optional(),
});

export type SignupLinkInput = z.input<typeof signupLinkSchema>;

export async function requestSignupLink(
  input: SignupLinkInput,
  next = "/dashboard"
): Promise<ActionResponse<{ email: string }>> {
  const parsed = signupLinkSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Please check your details.");
  }
  const { email, fullName, phone, cityId } = parsed.data;

  try {
    const supabase = await createClient();
    if (!supabase) return errorResponse("INTERNAL_ERROR", "Auth service unavailable");

    const sanitizedNext = safeNext(next);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // The email template appends token_hash and type to this URL ({{ .RedirectTo }}&token_hash=...).
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(sanitizedNext)}`,
        data: { full_name: fullName, phone, city_id: cityId ?? null },
      },
    });

    if (error) {
      const appErr = toAppError(error);
      return errorResponse(appErr.code, appErr.message);
    }
    return successResponse({ email });
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

const confirmSchema = z.object({
  tokenHash: z.string().trim().min(10).max(200),
  type: z.enum(["signup", "magiclink", "email"]),
  next: z.string().max(500).optional(),
});

export type ConfirmEmailInput = z.input<typeof confirmSchema>;

export async function confirmEmailLink(
  input: ConfirmEmailInput
): Promise<ActionResponse<{ destination: string }>> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse("INVALID_CODE", "This verification link is invalid.");
  }
  const { tokenHash, type, next } = parsed.data;

  try {
    const supabase = await createClient();
    if (!supabase) return errorResponse("INTERNAL_ERROR", "Auth service unavailable");

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      // Expired, already used, or never valid: the UI offers a way to get a new link.
      return errorResponse("CODE_EXPIRED", "This verification link has expired or was already used.");
    }

    const result = await resolvePostVerifyDestination(supabase, next || "/dashboard");
    return successResponse({ destination: result.destination });
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

export interface SignupHint {
  fullName?: string;
  phoneDigits?: string;
  cityId?: string;
}

export async function getSignupHint(): Promise<SignupHint | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const hint: SignupHint = {};

    if (typeof meta.full_name === "string" && meta.full_name.trim().length >= 2) {
      hint.fullName = meta.full_name.trim().slice(0, 80);
    }
    if (typeof meta.phone === "string") {
      const phone = normalizeIndianPhone(meta.phone);
      if (phone) hint.phoneDigits = phone.replace(/^\+91/, "");
    }
    if (typeof meta.city_id === "string" && /^[a-z0-9-]{1,40}$/i.test(meta.city_id)) {
      hint.cityId = meta.city_id;
    }
    return hint;
  } catch {
    return null;
  }
}
