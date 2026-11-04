"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "./viewer";
import { completeProfileSchema, CompleteProfileInput } from "@/lib/validation/profile";
import { normalizeIndianPhone } from "@/lib/phone";
import { safeNext } from "./safe-next";
import { ActionResponse, successResponse, errorResponse, toAppError, AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Profile } from "@/types/domain";

const DPDP_POLICY_VERSION = "2026.1";

/**
 * Normalizes email address securely.
 */
function normalizeEmail(rawEmail: string): string {
  const trimmed = rawEmail.trim().toLowerCase();
  if (trimmed.length > 254) {
    throw new AppError("VALIDATION_FAILED", 400, "Email address exceeds maximum length (254 characters).");
  }
  return trimmed;
}

/**
 * Initiates passwordless email OTP sign-in / sign-up.
 * Uses signInWithOtp with shouldCreateUser: true so the UI never leaks
 * whether the email already exists in the system.
 */
export async function requestOtp(
  rawEmail: string,
  locale = "en",
  next = "/dashboard"
): Promise<ActionResponse<{ email: string; message: string }>> {
  try {
    const email = normalizeEmail(rawEmail);
    const sanitizedNext = safeNext(next, locale);

    if (env.NEXT_PUBLIC_USE_MOCK) {
      // In mock mode, pretend code was sent successfully
      return successResponse({
        email,
        message: "Verification code sent to your email.",
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return errorResponse("INTERNAL_ERROR", "Auth service unavailable");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(sanitizedNext)}`,
      },
    });

    if (error) {
      const appErr = toAppError(error);
      return errorResponse(appErr.code, appErr.message);
    }

    return successResponse({
      email,
      message: "A 6-digit verification code has been sent to your email.",
    });
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

/**
 * Verifies the 6-digit OTP code submitted by the user.
 */
export async function verifyOtp(
  rawEmail: string,
  rawToken: string
): Promise<ActionResponse<{ verified: boolean; isComplete: boolean; userId: string }>> {
  try {
    const email = normalizeEmail(rawEmail);
    const token = rawToken.trim().replace(/\D/g, "");

    if (token.length !== 6) {
      return errorResponse("INVALID_CODE", "Please enter the complete 6-digit verification code.");
    }

    if (env.NEXT_PUBLIC_USE_MOCK) {
      const mockBuyer = memoryStore.users.find((u) => u.email === email) || memoryStore.users[0];
      return successResponse({
        verified: true,
        isComplete: Boolean(mockBuyer?.onboarding_completed_at),
        userId: mockBuyer?.id || "usr-buyer-1",
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return errorResponse("INTERNAL_ERROR", "Auth service unavailable");
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error || !data.user) {
      const appErr = toAppError(error);
      return errorResponse(appErr.code, appErr.message);
    }

    // Check if the user already has a completed profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", data.user.id)
      .single();

    const isComplete = Boolean(profile?.onboarding_completed_at);

    return successResponse({
      verified: true,
      isComplete,
      userId: data.user.id,
    });
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

/**
 * Generates OAuth URL for Google sign-in.
 */
export async function startGoogle(
  next = "/dashboard",
  locale = "en"
): Promise<ActionResponse<{ url: string }>> {
  try {
    const sanitizedNext = safeNext(next, locale);
    const callbackUrl = `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`;

    if (env.NEXT_PUBLIC_USE_MOCK) {
      return successResponse({ url: sanitizedNext });
    }

    const supabase = await createClient();
    if (!supabase) {
      return errorResponse("INTERNAL_ERROR", "Auth service unavailable");
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error || !data?.url) {
      const appErr = toAppError(error);
      return errorResponse(appErr.code, appErr.message);
    }

    return successResponse({ url: data.url });
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

/**
 * Saves completed profile details and records DPDP Act 2023 consents.
 * Enforces atomic profile creation and timestamping.
 */
export async function completeProfile(
  input: CompleteProfileInput
): Promise<ActionResponse<Profile>> {
  try {
    const parsed = completeProfileSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_FAILED",
        "Profile validation failed. Please check required fields.",
        parsed.error.flatten().fieldErrors
      );
    }

    const data = parsed.data;
    const phoneNormalized = normalizeIndianPhone(data.phone);
    if (!phoneNormalized) {
      return errorResponse("VALIDATION_FAILED", "Invalid Indian mobile number (+91 6-9XXXXXXXXX).");
    }

    const whatsappNormalized = data.whatsapp ? normalizeIndianPhone(data.whatsapp) : phoneNormalized;
    const now = new Date().toISOString();

    if (env.NEXT_PUBLIC_USE_MOCK) {
      const updatedProfile: Profile = {
        id: "usr-buyer-1",
        email: data.email,
        full_name: data.full_name,
        phone: phoneNormalized,
        whatsapp: whatsappNormalized,
        city_id: data.city_id,
        locale: data.locale,
        address: data.address || null,
        pincode: data.pincode || null,
        role: "buyer",
        is_active: true,
        onboarding_completed_at: now,
      };
      memoryStore.updateUser("usr-buyer-1", updatedProfile);
      return successResponse(updatedProfile);
    }

    const supabase = await createClient();
    if (!supabase) {
      return errorResponse("INTERNAL_ERROR", "Database client unavailable");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Active session required to complete onboarding.");
    }

    // Call atomic complete_profile RPC which securely updates profile and appends DPDP statutory consents
    const { data: savedProfile, error: rpcError } = await supabase.rpc(
      "complete_profile",
      {
        p_full_name: data.full_name,
        p_phone: phoneNormalized,
        p_whatsapp: whatsappNormalized,
        p_city_id: data.city_id,
        p_locale: data.locale || "en",
        p_address: data.address || null,
        p_pincode: data.pincode || null,
        p_marketing_consent: Boolean(data.marketing_consent),
        p_policy_version: DPDP_POLICY_VERSION,
      }
    );

    if (rpcError) {
      return errorResponse("INTERNAL_ERROR", `Failed to complete profile: ${rpcError.message}`);
    }

    return successResponse(savedProfile as Profile);
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

/**
 * Signs the user out cleanly from Supabase and refreshes router state.
 */
export async function signOut(): Promise<ActionResponse<{ success: boolean }>> {
  try {
    if (env.NEXT_PUBLIC_USE_MOCK) {
      return successResponse({ success: true });
    }

    const supabase = await createClient();
    if (supabase) {
      await supabase.auth.signOut({ scope: "local" });
    }

    return successResponse({ success: true });
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

/**
 * Admin-only action to invite new staff or reassign an existing user to a staff role.
 */
export async function inviteStaff(
  rawEmail: string,
  role: "consultant" | "manager" | "admin",
  showroomIds: string[] = []
): Promise<ActionResponse<{ userId: string; role: string; invited: boolean; message: string }>> {
  try {
    // 1. Enforce admin role authorization
    if (!env.NEXT_PUBLIC_USE_MOCK) {
      await requireRole("admin");
    }

    const email = normalizeEmail(rawEmail);

    if (env.NEXT_PUBLIC_USE_MOCK) {
      const existingUser = memoryStore.users.find((u) => u.email === email);
      if (existingUser) {
        memoryStore.updateUser(existingUser.id, { role, is_active: true });
        return successResponse({
          userId: existingUser.id,
          role,
          invited: false,
          message: `Staff role updated to ${role} for existing user ${email}.`,
        });
      }

      const newId = `usr-${role}-${Date.now()}`;
      memoryStore.users.push({
        id: newId,
        email,
        full_name: email.split("@")[0],
        role,
        is_active: true,
        locale: "en",
        onboarding_completed_at: new Date().toISOString(),
      });

      return successResponse({
        userId: newId,
        role,
        invited: true,
        message: `Invitation simulated for ${email} with role ${role}.`,
      });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return errorResponse("INTERNAL_ERROR", "Admin client unavailable");
    }

    // 2. Check if user already exists in profiles
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, email, role")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // User exists, update role and activate
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({
          role,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);

      if (updateError) {
        return errorResponse("INTERNAL_ERROR", `Failed to update role: ${updateError.message}`);
      }

      // Sync showroom assignments if provided
      if (showroomIds.length > 0) {
        await adminClient.from("staff_showrooms").delete().eq("profile_id", existingProfile.id);
        await adminClient.from("staff_showrooms").insert(
          showroomIds.map((sid, idx) => ({
            profile_id: existingProfile.id,
            showroom_id: sid,
            is_primary: idx === 0,
          }))
        );
      }

      return successResponse({
        userId: existingProfile.id,
        role,
        invited: false,
        message: `Updated existing user to role '${role}'.`,
      });
    }

    // 3. User does not exist, send invite email
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/staff`,
        data: {
          role,
          full_name: email.split("@")[0],
        },
      });

    if (inviteError || !inviteData?.user) {
      return errorResponse("INTERNAL_ERROR", `Failed to invite staff: ${inviteError?.message}`);
    }

    const userId = inviteData.user.id;

    // 4. Ensure profile row exists with assigned staff role
    const now = new Date().toISOString();
    const { error: profileUpsertError } = await adminClient.from("profiles").upsert({
      id: userId,
      email,
      full_name: email.split("@")[0],
      role,
      is_active: true,
      onboarding_completed_at: now,
      updated_at: now,
    });

    if (profileUpsertError) {
      console.warn(`Profile upsert warning for invited staff: ${profileUpsertError.message}`);
    }

    // Sync showroom assignments if provided
    if (showroomIds.length > 0) {
      await adminClient.from("staff_showrooms").delete().eq("profile_id", userId);
      await adminClient.from("staff_showrooms").insert(
        showroomIds.map((sid, idx) => ({
          profile_id: userId,
          showroom_id: sid,
          is_primary: idx === 0,
        }))
      );
    }

    return successResponse({
      userId,
      role,
      invited: true,
      message: `Staff invitation email sent to ${email} as ${role}.`,
    });
  } catch (err) {
    const appErr = toAppError(err);
    return errorResponse(appErr.code, appErr.message);
  }
}

