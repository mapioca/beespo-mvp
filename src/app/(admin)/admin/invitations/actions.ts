"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateInviteCode } from "@/lib/services/access-control/invite-code-generator";

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

export async function createInvitationAction(
  description: string,
  maxUses: number,
  expiresInDays: number | null
) {
  const { user } = await requireSysAdmin();
  const adminClient = createAdminClient();

  const code = generateInviteCode();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: invitation, error } = await adminClient
    .from("platform_invitations")
    .insert({
      code,
      description: description || null,
      max_uses: maxUses,
      uses_count: 0,
      status: "active",
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/invitations");
  return { success: true, code: invitation.code, id: invitation.id };
}

export async function revokeInvitationAction(id: string) {
  await requireSysAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("platform_invitations")
    .update({ status: "revoked" })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/invitations");
  return { success: true };
}
