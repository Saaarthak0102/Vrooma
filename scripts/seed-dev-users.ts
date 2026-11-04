/**
 * scripts/seed-dev-users.ts
 *
 * Seeds local development test users in Supabase Auth and the profiles table.
 * Strictly restricted to development environments (refuses to run in production).
 *
 * Usage:
 *   node --experimental-strip-types scripts/seed-dev-users.ts
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const DEV_TEST_USERS = [
  {
    email: "dev-buyer@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Aditya Mishra (Dev Buyer)",
    phone: "+919876500001",
    role: "buyer",
    locale: "en",
  },
  {
    email: "dev-consultant@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Rohit Verma (Dev Consultant)",
    phone: "+919876500011",
    role: "consultant",
    locale: "en",
  },
  {
    email: "dev-manager@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Vivek Saxena (Dev Manager)",
    phone: "+919876500020",
    role: "manager",
    locale: "en",
  },
  {
    email: "dev-admin@vrooma.in",
    password: "VroomaDevPass2026!",
    full_name: "Sanjay Singhania (Dev Admin)",
    phone: "+919876500099",
    role: "admin",
    locale: "en",
  },
];

async function main() {
  loadEnv();

  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Cannot run dev seeding in production!");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Seeding development test users...");

  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existingUsers = usersData?.users || [];

  const now = new Date().toISOString();

  for (const testUser of DEV_TEST_USERS) {
    let authUser = existingUsers.find(
      (u) => u.email?.toLowerCase() === testUser.email.toLowerCase()
    );

    if (!authUser) {
      console.log(`Creating auth user: ${testUser.email}`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: {
          full_name: testUser.full_name,
        },
      });

      if (error || !data.user) {
        console.error(`Failed to create ${testUser.email}:`, error?.message);
        continue;
      }
      authUser = data.user;
    } else {
      console.log(`Updating password for existing user: ${testUser.email}`);
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: testUser.password,
        email_confirm: true,
      });
    }

    // Upsert into profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authUser.id,
      email: testUser.email,
      full_name: testUser.full_name,
      phone: testUser.phone,
      role: testUser.role,
      locale: testUser.locale,
      is_active: true,
      onboarding_completed_at: now,
      updated_at: now,
    });

    if (profileError) {
      console.error(`Failed to update profile for ${testUser.email}:`, profileError.message);
    } else {
      console.log(`✓ Seeded ${testUser.role}: ${testUser.email}`);
    }
  }

  console.log("\nDev users seeded successfully.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

