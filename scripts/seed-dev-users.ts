/**
 * scripts/seed-dev-users.ts
 *
 * Seeds local development test users in Supabase Auth, profiles, and staff_showrooms.
 * Uses deterministic RFC 4122 hex UUIDs aligned with supabase/seed.sql.
 *
 * DEV-ONLY SAFETY:
 *   - Strictly restricted to DEV project 'eobtzcwinjmimzisypca'.
 *   - Hard-rejects production ref 'ajumkjokagqfdikfguti'.
 *   - Hard-rejects deleted legacy ref 'gmyrehlrmifxckszrdje'.
 *   - Rejects execution if APP_ENV or NODE_ENV is 'production'.
 *   - Validates that NEXT_PUBLIC_SUPABASE_URL targets the same project ref.
 *   - Never prints or logs secrets or passwords.
 *
 * IDEMPOTENCY:
 *   - Reuses existing Auth users by stable email/identity.
 *   - Does not overwrite passwords unnecessarily.
 *   - Upserts profiles using auth user ID as primary key.
 *   - Upserts staff_showrooms using (profile_id, showroom_id) composite key.
 *   - Validates showroom foreign key dependencies before inserting staff mappings.
 *
 * Usage:
 *   SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca node --experimental-strip-types scripts/seed-dev-users.ts
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export const EXPECTED_DEV_PROJECT_REF = "eobtzcwinjmimzisypca";
export const FORBIDDEN_PROJECT_REFS = new Set([
  "ajumkjokagqfdikfguti", // Production
  "gmyrehlrmifxckszrdje", // Historical deleted ref
]);

export interface DevUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: "buyer" | "consultant" | "manager" | "admin";
  locale: "en";
  showroom_id?: string;
  notes?: string;
}

/**
 * Canonical Nine Test Personas for Vrooma Development & Verification:
 * 1. Dev Buyer (Customer with DPDP consent)
 * 2. Dev Consultant (Hazratganj Flagship quick-login consultant)
 * 3. Rohit Verma (Hazratganj Senior Consultant - Rule 1 & 2 pool)
 * 4. Ananya Shukla (Hazratganj Consultant - Rule 1 pool)
 * 5. Faizan Khan (Gomti Nagar Experience Center Consultant - Rule 3 pool)
 * 6. Deepak Tripathi (Gomti Nagar Hindi Specialist Consultant)
 * 7. Pooja Singh (Kanpur City Center Consultant - Rule 4 pool)
 * 8. Dev Manager / Vivek Saxena (Used Car Manager - Shaheed Path Hub)
 * 9. Dev Admin / Sanjay Singhania (Dealer Principal & System Administrator)
 */
export const DEV_TEST_USERS: DevUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "dev-buyer@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Aditya Mishra (Dev Buyer)",
    phone: "+919876500001",
    role: "buyer",
    locale: "en",
    notes: "Default verified car buyer persona with active consent",
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    email: "dev-consultant@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Dev Consultant",
    phone: "+919876500010",
    role: "consultant",
    locale: "en",
    showroom_id: "a0000001-0000-0000-0000-000000000001",
    notes: "Lead desk sales consultant (Flagship Hazratganj)",
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    email: "rohit.verma@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Rohit Verma (Dev Consultant)",
    phone: "+919876500011",
    role: "consultant",
    locale: "en",
    showroom_id: "a0000001-0000-0000-0000-000000000001",
    notes: "Senior consultant (Flagship Hazratganj) in Rule 1 & 2 pool",
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    email: "ananya.shukla@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Ananya Shukla (Dev Consultant)",
    phone: "+919876500012",
    role: "consultant",
    locale: "en",
    showroom_id: "a0000001-0000-0000-0000-000000000001",
    notes: "Sales consultant (Flagship Hazratganj) in Rule 1 pool",
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    email: "faizan.khan@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Faizan Khan (Dev Consultant)",
    phone: "+919876500013",
    role: "consultant",
    locale: "en",
    showroom_id: "a0000001-0000-0000-0000-000000000002",
    notes: "Sales consultant (Gomti Nagar Experience Center) in Rule 3 pool",
  },
  {
    id: "00000000-0000-0000-0000-000000000014",
    email: "deepak.tripathi@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Deepak Tripathi (Dev Consultant)",
    phone: "+919876500014",
    role: "consultant",
    locale: "en",
    showroom_id: "a0000001-0000-0000-0000-000000000002",
    notes: "Hindi specialist consultant (Gomti Nagar Experience Center)",
  },
  {
    id: "00000000-0000-0000-0000-000000000015",
    email: "pooja.singh@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Pooja Singh (Dev Consultant)",
    phone: "+919876500015",
    role: "consultant",
    locale: "en",
    showroom_id: "a0000001-0000-0000-0000-000000000003",
    notes: "Sales consultant (Kanpur City Center) in Rule 4 pool",
  },
  {
    id: "00000000-0000-0000-0000-000000000019",
    email: "dev-manager@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Vivek Saxena (Dev Manager)",
    phone: "+919876500019",
    role: "manager",
    locale: "en",
    showroom_id: "a0000001-0000-0000-0000-000000000001",
    notes: "Used car manager with AI valuation band access & inventory authority",
  },
  {
    id: "00000000-0000-0000-0000-000000000099",
    email: "dev-admin@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Sanjay Singhania (Dev Admin)",
    phone: "+919876500099",
    role: "admin",
    locale: "en",
    notes: "Dealer Principal with full administrative authority",
  },
];

export interface EnvValidationResult {
  ok: boolean;
  error?: string;
  projectRef?: string;
  supabaseUrl?: string;
}

/**
 * Validates development environment configuration safely and deterministically.
 */
export function validateDevEnvironment(env: Record<string, string | undefined> = process.env): EnvValidationResult {
  // 1. Guard against production environment flags
  const appEnv = (env.APP_ENV || "").toLowerCase();
  const nodeEnv = (env.NODE_ENV || "").toLowerCase();
  if (appEnv === "production" || nodeEnv === "production") {
    return {
      ok: false,
      error: "FATAL: Cannot seed dev users in a production environment (APP_ENV or NODE_ENV is 'production').",
    };
  }

  // 2. Validate SUPABASE_PROJECT_REF
  const projectRef = (env.SUPABASE_PROJECT_REF || env.PROJECT_REF || "").trim();
  if (!projectRef) {
    return {
      ok: false,
      error: `BLOCKED: SUPABASE_PROJECT_REF environment variable is required. Expected DEV ref: '${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  if (FORBIDDEN_PROJECT_REFS.has(projectRef)) {
    return {
      ok: false,
      error: `BLOCKED: Project reference '${projectRef}' is a forbidden reference. Target strictly the active DEV project '${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  if (projectRef !== EXPECTED_DEV_PROJECT_REF) {
    return {
      ok: false,
      error: `BLOCKED: Target project reference '${projectRef}' does not match expected DEV reference '${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  // 3. Validate NEXT_PUBLIC_SUPABASE_URL
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
  if (!supabaseUrl) {
    return {
      ok: false,
      error: "BLOCKED: NEXT_PUBLIC_SUPABASE_URL is missing.",
    };
  }

  // Ensure URL belongs strictly to eobtzcwinjmimzisypca.supabase.co
  const urlMatch = supabaseUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  if (!urlMatch) {
    return {
      ok: false,
      error: `BLOCKED: Supabase URL '${supabaseUrl}' is not a valid Supabase project URL.`,
    };
  }

  const urlRef = urlMatch[1].toLowerCase();
  if (FORBIDDEN_PROJECT_REFS.has(urlRef) || urlRef !== EXPECTED_DEV_PROJECT_REF) {
    return {
      ok: false,
      error: `BLOCKED: Supabase URL references project '${urlRef}', which does not match DEV project '${EXPECTED_DEV_PROJECT_REF}'.`,
    };
  }

  // 4. Validate Secret Key Presence (without exposing its value)
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    return {
      ok: false,
      error: "BLOCKED: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required to provision Auth users.",
    };
  }

  return {
    ok: true,
    projectRef,
    supabaseUrl,
  };
}

/**
 * Validates persona array against database enum rules and foreign key integrity.
 */
export function validatePersonas(personas: DevUser[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const validRoles = new Set(["buyer", "consultant", "manager", "admin"]);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const phoneRegex = /^\+91[6-9][0-9]{9}$/;
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  for (const user of personas) {
    // Check ID format and uniqueness
    if (!uuidRegex.test(user.id)) {
      errors.push(`User ${user.email} has invalid UUID: '${user.id}'`);
    }
    if (seenIds.has(user.id)) {
      errors.push(`Duplicate user ID: '${user.id}' for ${user.email}`);
    }
    seenIds.add(user.id);

    // Check Email uniqueness
    const normalizedEmail = user.email.toLowerCase();
    if (seenEmails.has(normalizedEmail)) {
      errors.push(`Duplicate email: '${user.email}'`);
    }
    seenEmails.add(normalizedEmail);

    // Check Role enum
    if (!validRoles.has(user.role)) {
      errors.push(`User ${user.email} has invalid role: '${user.role}'`);
    }

    // Check Phone format (+91 followed by 10 digits starting with 6-9)
    if (!phoneRegex.test(user.phone)) {
      errors.push(`User ${user.email} has invalid Indian phone: '${user.phone}'`);
    }

    // Role-specific constraints
    if (user.role === "buyer" && user.showroom_id) {
      errors.push(`Buyer ${user.email} must not have a showroom_id assigned`);
    }

    if ((user.role === "consultant" || user.role === "manager") && !user.showroom_id) {
      errors.push(`Staff member ${user.email} (${user.role}) must have a showroom_id assigned`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export interface SeedOptions {
  resetPasswords?: boolean;
}

export interface SeedResult {
  ok: boolean;
  total: number;
  created: number;
  reused: number;
  profilesUpdated: number;
  showroomsAssigned: number;
  errors: string[];
}

/**
 * Idempotently seeds dev test users in Supabase Auth and database tables.
 */
export async function seedDevUsers(
  supabase: any,
  personas: DevUser[] = DEV_TEST_USERS,
  options: SeedOptions = {}
): Promise<SeedResult> {
  const result: SeedResult = {
    ok: true,
    total: personas.length,
    created: 0,
    reused: 0,
    profilesUpdated: 0,
    showroomsAssigned: 0,
    errors: [],
  };

  // 1. Static persona validation
  const validation = validatePersonas(personas);
  if (!validation.ok) {
    result.ok = false;
    result.errors.push(...validation.errors);
    return result;
  }

  // 2. Verify prerequisite showroom IDs exist in public.showrooms
  const { data: showrooms, error: showroomError } = await supabase
    .from("showrooms")
    .select("id, name");

  if (showroomError) {
    result.ok = false;
    result.errors.push(`Failed to verify catalog showrooms: ${showroomError.message}`);
    return result;
  }

  const existingShowroomIds = new Set<string>((showrooms || []).map((s: any) => s.id));

  for (const user of personas) {
    if (user.showroom_id && !existingShowroomIds.has(user.showroom_id)) {
      result.ok = false;
      result.errors.push(
        `Prerequisite showroom '${user.showroom_id}' for user ${user.email} does not exist in public.showrooms. Apply catalog seed data first.`
      );
    }
  }

  if (!result.ok) {
    return result;
  }

  // 3. Query existing Auth users to ensure idempotency and prevent duplicates
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    result.ok = false;
    result.errors.push(`Failed to query existing auth users: ${listError.message}`);
    return result;
  }

  const existingUsers: any[] = usersData?.users || [];
  const now = new Date().toISOString();

  // 4. Provision or reuse each test persona
  for (const testUser of personas) {
    let authUser = existingUsers.find(
      (u: any) =>
        u.email?.toLowerCase() === testUser.email.toLowerCase() || u.id === testUser.id
    );

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        id: testUser.id,
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: {
          full_name: testUser.full_name,
        },
      });

      if (error || !data?.user) {
        result.errors.push(`Failed to create Auth user for ${testUser.email}: ${error?.message || "Unknown error"}`);
        continue;
      }
      authUser = data.user;
      result.created++;
    } else {
      result.reused++;
      // Only update password if explicitly requested
      if (options.resetPasswords) {
        await supabase.auth.admin.updateUserById(authUser.id, {
          password: testUser.password,
          email_confirm: true,
        });
      }
    }

    // 5. Idempotent Upsert into public.profiles
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authUser.id,
        email: testUser.email,
        full_name: testUser.full_name,
        phone: testUser.phone,
        role: testUser.role,
        locale: testUser.locale,
        is_active: true,
        onboarding_completed_at: now,
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      result.errors.push(`Failed to upsert profile for ${testUser.email}: ${profileError.message}`);
      continue;
    }
    result.profilesUpdated++;

    // 6. Idempotent Upsert into public.staff_showrooms (for staff roles only)
    if (testUser.showroom_id && (testUser.role === "consultant" || testUser.role === "manager")) {
      const { error: staffError } = await supabase.from("staff_showrooms").upsert(
        {
          profile_id: authUser.id,
          showroom_id: testUser.showroom_id,
          is_primary: true,
        },
        { onConflict: "profile_id,showroom_id" }
      );

      if (staffError) {
        result.errors.push(`Failed to map showroom for ${testUser.email}: ${staffError.message}`);
        continue;
      }
      result.showroomsAssigned++;
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}

/**
 * Helper to load environment variables from .env.local without exposing values.
 */
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

async function main() {
  loadEnv();

  console.log("=== VROOMA DEV AUTH USER SEEDING RUNNER ===");

  // 1. Validate environment before any operation
  const envValidation = validateDevEnvironment(process.env);
  if (!envValidation.ok) {
    console.error(`\n❌ Environment check failed:\n   ${envValidation.error}\n`);
    process.exit(1);
  }

  console.log(`\nTarget project verified: ${envValidation.projectRef}`);
  console.log(`Target URL verified:     ${envValidation.supabaseUrl}`);

  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(envValidation.supabaseUrl!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const resetPasswords = process.argv.includes("--reset-passwords");
  console.log(`Seeding ${DEV_TEST_USERS.length} canonical dev personas (reset passwords: ${resetPasswords})...\n`);

  const result = await seedDevUsers(supabase, DEV_TEST_USERS, { resetPasswords });

  console.log("=== SEEDING SUMMARY ===");
  console.log(`Total Personas:       ${result.total}`);
  console.log(`Created in Auth:      ${result.created}`);
  console.log(`Reused existing Auth: ${result.reused}`);
  console.log(`Profiles Synchronized:${result.profilesUpdated}`);
  console.log(`Showroom Assignments: ${result.showroomsAssigned}`);
  console.log(`Errors Encountered:   ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.error("\n❌ Errors during seeding:");
    for (const err of result.errors) {
      console.error(`   - ${err}`);
    }
    process.exit(1);
  }

  console.log("\n✅ All 9 dev test users successfully seeded and verified!");
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  // Only execute main when invoked directly via CLI
  const isDirectRun =
    typeof process.argv[1] === "string" &&
    process.argv[1].endsWith("seed-dev-users.ts");

  if (isDirectRun) {
    main().catch((err) => {
      console.error("Fatal error:", err.message || err);
      process.exit(1);
    });
  }
}
