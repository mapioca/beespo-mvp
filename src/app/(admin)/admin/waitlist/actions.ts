"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateInviteCode } from "@/lib/services/access-control/invite-code-generator";
import { sendAdminPlatformInviteEmail } from "@/lib/email/send-admin-platform-invite-email";

async function requireSysAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("is_sys_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_sys_admin) throw new Error("Forbidden");

  return { supabase, user };
}

export async function inviteWaitlistUserAction(
  waitlistId: string,
  email: string
) {
  const { user } = await requireSysAdmin();
  const adminClient = createAdminClient();

  const code = generateInviteCode();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: invitation, error: inviteError } = await adminClient
    .from("platform_invitations")
    .insert({
      code,
      description: `Waitlist invite for ${email}`,
      max_uses: 1,
      uses_count: 0,
      status: "active",
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select()
    .single();

  if (inviteError || !invitation) {
    return { success: false, error: inviteError?.message || "Failed to create invitation" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const signupLink = `${appUrl}/signup?code=${code}`;

  await sendAdminPlatformInviteEmail({ toEmail: email, inviteCode: code, signupLink });

  const { error: updateError } = await adminClient
    .from("waitlist_signups")
    .update({
      invited_at: new Date().toISOString(),
      invited_by: user.id,
    })
    .eq("id", waitlistId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/waitlist");
  return { success: true, code };
}
