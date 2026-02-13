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

export async function createPlatformInviteAction(
  email: string,
  description?: string
) {
  await requireSysAdmin();
  const adminClient = createAdminClient();

  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invitation, error } = await adminClient
    .from("platform_invitations")
    .insert({
      code,
      description: description || `Invite for ${email}`,
      max_uses: 1,
      uses_count: 0,
      status: "active",
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const signupLink = `${appUrl}/signup?code=${code}`;

  await sendAdminPlatformInviteEmail({
    toEmail: email,
    inviteCode: code,
    signupLink,
  });

  revalidatePath("/users");
  return { success: true, code: invitation.code };
}

export async function toggleSysAdminAction(userId: string, newValue: boolean) {
  await requireSysAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("profiles")
    .update({ is_sys_admin: newValue })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/users");
  return { success: true };
}
