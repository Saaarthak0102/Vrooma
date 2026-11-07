import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { Profile, Role } from "@/types/domain";
import { AppError } from "@/lib/errors";

import type { Database } from "@/types/database.types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROFILE_COLUMNS = "id, email, full_name, phone, whatsapp, city_id, role, locale, is_active, created_at, updated_at";

const LEGACY_ID_MAP: Record<string, string> = {
  "usr-buyer-1": "00000000-0000-0000-0000-000000000001",
  "usr-consultant-1": "00000000-0000-0000-0000-000000000010",
  "usr-consultant-2": "00000000-0000-0000-0000-000000000011",
  "usr-consultant-3": "00000000-0000-0000-0000-000000000012",
  "usr-manager-1": "00000000-0000-0000-0000-000000000019",
  "usr-admin-1": "00000000-0000-0000-0000-000000000099",
};

function normalizeUserId(id: string): string {
  if (LEGACY_ID_MAP[id]) return LEGACY_ID_MAP[id];
  return id;
}

function mapRowToProfile(row: any): Profile {
  return {
    id: row.id,
    email: row.email || "",
    full_name: row.full_name || "",
    phone: row.phone || null,
    whatsapp: row.whatsapp || null,
    city_id: row.city_id || null,
    role: row.role as Role,
    locale: "en",
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return createPublicClient();
  }
}

/**
 * List profiles, optionally filtered by user role.
 */
export async function listUsers(role?: Role): Promise<Profile[]> {
  const supabase = getClient();
  let query = supabase
    .from("profiles")
    .select(PROFILE_COLUMNS);

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query
    .order("full_name", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to list users: ${error.message}`);
  }

  return (data ?? []).map(mapRowToProfile);
}

/**
 * Fetch a single user profile by ID.
 */
export async function getUserById(id: string): Promise<Profile | null> {
  const normalizedId = normalizeUserId(id);
  if (!UUID_REGEX.test(normalizedId)) {
    return null;
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch profile ${id}: ${error.message}`);
  }

  if (!data) return null;
  return mapRowToProfile(data);
}

/**
 * Update a user profile by ID.
 */
export async function updateUser(id: string, updates: Partial<Profile>): Promise<Profile> {
  const normalizedId = normalizeUserId(id);
  if (!UUID_REGEX.test(normalizedId)) {
    throw new Error("User not found");
  }

  const supabase = getClient();

  const updatePayload: ProfileUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone;
  if (updates.whatsapp !== undefined) updatePayload.whatsapp = updates.whatsapp;
  if (updates.city_id !== undefined) updatePayload.city_id = updates.city_id;
  if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", normalizedId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to update profile ${id}: ${error.message}`);
  }

  if (!data) {
    throw new Error("User not found");
  }

  return mapRowToProfile(data);
}
