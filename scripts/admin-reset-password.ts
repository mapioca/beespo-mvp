/**
 * Admin Password Reset Script
 *
 * Usage: npm run admin:reset-password moises@beespo.com MyNewPassword123
 *
 * Sets a new password for an existing user via the Supabase Admin API.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  );
  process.exit(1);
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !email.includes("@") || !newPassword) {
  console.error(
    "Usage: npm run admin:reset-password <email> <new-password>"
  );
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  // Find the user
  const { data: usersData, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const user = usersData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  // Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error("Failed to update password:", updateError.message);
    process.exit(1);
  }

  console.log(`\nPassword updated for ${email}`);
  console.log(`You can now log in at http://admin.localhost:3000\n`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
