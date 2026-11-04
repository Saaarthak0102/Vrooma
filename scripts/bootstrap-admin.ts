/**
 * scripts/bootstrap-admin.ts
 *
 * Bootstraps the first administrator account in Vrooma.
 * Uses SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) to find or invite the user,
 * then grants the 'admin' role in the profiles table and sets onboarding_completed_at.
 *
 * Usage:
 *   node --experimental-strip-types scripts/bootstrap-admin.ts <email> [--force]
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local or .env
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

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const emailArg = args.find((a) => !a.startsWith("--"));

  if (!emailArg) {
    console.error("Usage: node --experimental-strip-types scripts/bootstrap-admin.ts <email> [--force]");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.");
    console.error("Please configure these in your .env.local file.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`Checking for existing admin accounts...`);

  // Check if an admin already exists
  const { data: existingAdmins, error: checkError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", "admin");

  if (checkError) {
    console.warn(`Warning: Could not check existing admins: ${checkError.message}`);
  } else if (existingAdmins && existingAdmins.length > 0 && !force) {
    console.error(
      `Error: Found ${existingAdmins.length} existing admin user(s) (${existingAdmins.map((a) => a.email).join(", ")}).`
    );
    console.error("Refusing to bootstrap without --force flag.");
    console.error("Run with '--force' to grant admin rights to this email anyway.");
    process.exit(1);
  }

  console.log(`Locating user with email '${email}' in Auth...`);

  // Search users via admin API
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`Error querying auth users: ${listError.message}`);
    process.exit(1);
  }

  let user = usersData?.users?.find((u) => u.email?.toLowerCase() === email);

  if (!user) {
    console.log(`User not found in Auth. Sending invitation to ${email}...`);
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      console.warn(`Invitation failed (${inviteError.message}). Attempting to create user directly...`);
      const { data: createData, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: "Administrator" },
        });

      if (createError || !createData.user) {
        console.error(`Failed to create user: ${createError?.message}`);
        process.exit(1);
      }
      user = createData.user;
    } else {
      user = inviteData.user;
    }
  }

  if (!user) {
    console.error("Error: Could not resolve or create user in Supabase Auth.");
    process.exit(1);
  }

  console.log(`Found Auth User [${user.id}]. Updating profile to admin...`);

  const now = new Date().toISOString();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email || email,
      full_name: user.user_metadata?.full_name || "System Admin",
      role: "admin",
      is_active: true,
      onboarding_completed_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (profileError) {
    console.error(`Failed to update profile: ${profileError.message}`);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log(" SUCCESS: Administrator account bootstrapped!");
  console.log(` User ID:     ${user.id}`);
  console.log(` Email:       ${email}`);
  console.log(` Role:        ${profile.role}`);
  console.log(` Active:      ${profile.is_active}`);
  console.log(` Onboarded:   ${profile.onboarding_completed_at}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

