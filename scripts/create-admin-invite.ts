/**
 * Create Admin Invite Script
 *
 * Usage: npx tsx scripts/create-admin-invite.ts <email>
 *
 * This script:
 * 1. Checks if the user already exists in Supabase Auth
 * 2. If not, invites them via email
 * 3. Upserts their profile with is_sys_admin = true
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  );
  console.error("Run with: npx tsx -r dotenv/config scripts/create-admin-invite.ts <email>");
  process.exit(1);
}

const email = process.argv[2];

if (!email || !email.includes("@")) {
  console.error("Usage: npx tsx scripts/create-admin-invite.ts <email>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log(`\nSetting up admin for: ${email}\n`);

  // 1. Check if user exists
  const { data: usersData, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const existingUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId: string;

  if (existingUser) {
    console.log(`User already exists (id: ${existingUser.id})`);
    userId = existingUser.id;
  } else {
    // 2. Invite user by email
    console.log("User not found. Sending invite email...");

    const redirectTo = process.env.NEXT_PUBLIC_ADMIN_HOST
      ? `http://${process.env.NEXT_PUBLIC_ADMIN_HOST}/login`
      : "http://admin.localhost:3000/login";

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });

    if (inviteError) {
      console.error("Failed to invite user:", inviteError.message);
      process.exit(1);
    }

    userId = inviteData.user.id;
    console.log(`Invite sent. User created (id: ${userId})`);
  }

  // 3. Upsert profile with sys_admin flag
  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: email,
      full_name: email.split("@")[0],
      role: "admin",
      is_sys_admin: true,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("Failed to upsert profile:", upsertError.message);
    process.exit(1);
  }

  console.log(`Profile updated: is_sys_admin = true, role = admin`);
  console.log(`\nDone! ${email} is now a system administrator.\n`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
