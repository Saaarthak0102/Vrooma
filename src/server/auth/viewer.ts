import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Profile, Role } from "@/types/domain";
import { AppError } from "@/lib/errors";

export interface Viewer {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isComplete: boolean;
}

/**
 * Returns current authenticated viewer (claims + database profile).
 * Cached per server request using React cache().
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  if (!supabase) {
    return { user: null, profile: null, isAuthenticated: false, isComplete: false };
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, profile: null, isAuthenticated: false, isComplete: false };
    }

    // Fetch database profile directly (Never trust user_metadata for role)
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      // User authenticated in auth.users but profile row not yet created/synced
      return {
        user: { id: user.id, email: user.email || "" },
        profile: null,
        isAuthenticated: true,
        isComplete: false,
      };
    }

    const isComplete = Boolean(profileData.onboarding_completed_at);

    return {
      user: { id: user.id, email: user.email || "" },
      profile: profileData as Profile,
      isAuthenticated: true,
      isComplete,
    };
  } catch {
    return { user: null, profile: null, isAuthenticated: false, isComplete: false };
  }
});

/**
 * Ensures user is authenticated. Throws AppError(401) otherwise.
 */
export async function requireUser(): Promise<{ user: { id: string; email: string }; profile: Profile | null }> {
  const viewer = await getViewer();
  if (!viewer.isAuthenticated || !viewer.user) {
    throw new AppError("UNAUTHORIZED", 401, "Authentication required to perform this action.");
  }
  return { user: viewer.user, profile: viewer.profile };
}

/**
 * Ensures user has an active, completed profile. Throws AppError(409) if onboarding is incomplete.
 */
export async function requireCompleteProfile(): Promise<{ user: { id: string; email: string }; profile: Profile }> {
  const { user, profile } = await requireUser();

  if (!profile || !profile.onboarding_completed_at) {
    throw new AppError(
      "INCOMPLETE_PROFILE",
      409,
      "Please complete your profile details before proceeding."
    );
  }

  if (profile.is_active === false) {
    throw new AppError("ACCOUNT_DISABLED", 403, "Your account has been deactivated. Please contact support.");
  }

  return { user, profile };
}

/**
 * Ensures user possesses one of the required authorization roles.
 */
export async function requireRole(...allowedRoles: Role[]): Promise<{ user: { id: string; email: string }; profile: Profile }> {
  const { user, profile } = await requireCompleteProfile();

  if (!allowedRoles.includes(profile.role)) {
    throw new AppError(
      "FORBIDDEN",
      403,
      `Access denied. Requires one of roles: [${allowedRoles.join(", ")}].`
    );
  }

  return { user, profile };
}
