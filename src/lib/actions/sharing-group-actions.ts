"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SharingGroup, SharingGroupWithMembers, ShareActivityAction } from "@/types/share";

// ── Audit log helper ──────────────────────────────────────────────────────────

async function logActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entry: {
    workspace_id: string;
    action: ShareActivityAction;
    entity_type: string;
    entity_id: string | null;
    target_email: string | null;
    sharing_group_id: string | null;
    performed_by: string;
    details: Record<string, unknown>;
  }
) {
  // Fire-and-forget — do not block on errors
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("share_activity_log") as any)
      .insert(entry);
  } catch {}
}

// ── getSharingGroups ──────────────────────────────────────────────────────────

export async function getSharingGroups(): Promise<{
  data: SharingGroupWithMembers[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { data: null, error: "No workspace found" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups, error } = await (supabase.from("sharing_groups") as any)
    .select(
      `
      id,
      workspace_id,
      name,
      description,
      created_by,
      created_at,
      updated_at,
      members:sharing_group_members(id, group_id, email, added_by, created_at)
    `
    )
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch sharing groups:", error);
    return { data: null, error: error.message };
  }

  const groupsWithCount: SharingGroupWithMembers[] = (groups || []).map(
    (g: SharingGroupWithMembers & { members: unknown[] }) => ({
      ...g,
      member_count: g.members?.length ?? 0,
    })
  );

  return { data: groupsWithCount, error: null };
}

// ── getSharingGroup ───────────────────────────────────────────────────────────

export async function getSharingGroup(groupId: string): Promise<{
  data: SharingGroupWithMembers | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { data: null, error: "No workspace found" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error } = await (supabase.from("sharing_groups") as any)
    .select(
      `
      id,
      workspace_id,
      name,
      description,
      created_by,
      created_at,
      updated_at,
      members:sharing_group_members(id, group_id, email, added_by, created_at)
    `
    )
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (error) {
    console.error("Failed to fetch sharing group:", error);
    return { data: null, error: error.message };
  }

  if (!group) {
    return { data: null, error: "Group not found" };
  }

  const groupWithCount: SharingGroupWithMembers = {
    ...group,
    member_count: group.members?.length ?? 0,
  };

  return { data: groupWithCount, error: null };
}

// ── createSharingGroup ────────────────────────────────────────────────────────

export async function createSharingGroup({
  name,
  description,
  memberEmails,
}: {
  name: string;
  description?: string;
  memberEmails: string[];
}): Promise<{ data: SharingGroup | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { data: null, error: "No workspace found" };
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return { data: null, error: "Only admins and leaders can create sharing groups" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupError } = await (supabase.from("sharing_groups") as any)
    .insert({
      workspace_id: profile.workspace_id,
      name,
      description: description ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (groupError) {
    console.error("Failed to create sharing group:", groupError);
    return { data: null, error: groupError.message };
  }

  // Add members if provided
  if (memberEmails.length > 0) {
    const memberRows = memberEmails.map((email) => ({
      group_id: group.id,
      email: email.toLowerCase().trim(),
      added_by: user.id,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: membersError } = await (supabase.from("sharing_group_members") as any)
      .insert(memberRows);

    if (membersError) {
      console.error("Failed to add members to sharing group:", membersError);
      // Group was created; return it but surface the member error
      return { data: group as SharingGroup, error: `Group created but failed to add members: ${membersError.message}` };
    }
  }

  await logActivity(supabase, {
    workspace_id: profile.workspace_id,
    action: "group_created",
    entity_type: "meeting",
    entity_id: null,
    target_email: null,
    sharing_group_id: group.id,
    performed_by: user.id,
    details: { group_name: name, initial_member_count: memberEmails.length },
  });

  revalidatePath("/settings");

  return { data: group as SharingGroup, error: null };
}

// ── updateSharingGroup ────────────────────────────────────────────────────────

export async function updateSharingGroup(
  groupId: string,
  { name, description }: { name?: string; description?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { error: "No workspace found" };
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return { error: "Only admins and leaders can update sharing groups" };
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("sharing_groups") as any)
    .update(updates)
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id);

  if (error) {
    console.error("Failed to update sharing group:", error);
    return { error: error.message };
  }

  await logActivity(supabase, {
    workspace_id: profile.workspace_id,
    action: "group_updated",
    entity_type: "meeting",
    entity_id: null,
    target_email: null,
    sharing_group_id: groupId,
    performed_by: user.id,
    details: { updated_fields: Object.keys(updates).filter((k) => k !== "updated_at") },
  });

  revalidatePath("/settings");

  return { error: null };
}

// ── deleteSharingGroup ────────────────────────────────────────────────────────

export async function deleteSharingGroup(
  groupId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { error: "No workspace found" };
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return { error: "Only admins and leaders can delete sharing groups" };
  }

  // Verify group belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase.from("sharing_groups") as any)
    .select("id, name")
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (!group) {
    return { error: "Group not found" };
  }

  // Revoke all active meeting shares associated with this group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: revokeError } = await (supabase.from("meeting_shares") as any)
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("sharing_group_id", groupId)
    .eq("status", "active");

  if (revokeError) {
    console.error("Failed to revoke meeting shares for group:", revokeError);
    return { error: revokeError.message };
  }

  // Delete group (cascade removes sharing_group_members)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase.from("sharing_groups") as any)
    .delete()
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id);

  if (deleteError) {
    console.error("Failed to delete sharing group:", deleteError);
    return { error: deleteError.message };
  }

  await logActivity(supabase, {
    workspace_id: profile.workspace_id,
    action: "revoked",
    entity_type: "meeting",
    entity_id: null,
    target_email: null,
    sharing_group_id: groupId,
    performed_by: user.id,
    details: { group_name: group.name, reason: "group_deleted" },
  });

  revalidatePath("/settings");

  return { error: null };
}

// ── addGroupMember ────────────────────────────────────────────────────────────

export async function addGroupMember(
  groupId: string,
  email: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { error: "No workspace found" };
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return { error: "Only admins and leaders can add group members" };
  }

  // Verify group belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase.from("sharing_groups") as any)
    .select("id")
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (!group) {
    return { error: "Group not found" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("sharing_group_members") as any)
    .insert({
      group_id: groupId,
      email: normalizedEmail,
      added_by: user.id,
    });

  if (error) {
    console.error("Failed to add group member:", error);
    return { error: error.message };
  }

  await logActivity(supabase, {
    workspace_id: profile.workspace_id,
    action: "member_added",
    entity_type: "meeting",
    entity_id: null,
    target_email: normalizedEmail,
    sharing_group_id: groupId,
    performed_by: user.id,
    details: { email: normalizedEmail },
  });

  revalidatePath("/settings");

  return { error: null };
}

// ── removeGroupMember ─────────────────────────────────────────────────────────

export async function removeGroupMember(
  groupId: string,
  email: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { error: "No workspace found" };
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return { error: "Only admins and leaders can remove group members" };
  }

  // Verify group belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase.from("sharing_groups") as any)
    .select("id")
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (!group) {
    return { error: "Group not found" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // CRITICAL: Revoke all active meeting shares for this member in this group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: revokeError } = await (supabase.from("meeting_shares") as any)
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("sharing_group_id", groupId)
    .eq("recipient_email", normalizedEmail)
    .eq("status", "active");

  if (revokeError) {
    console.error("Failed to revoke meeting shares for member:", revokeError);
    return { error: revokeError.message };
  }

  // Remove member from group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase.from("sharing_group_members") as any)
    .delete()
    .eq("group_id", groupId)
    .eq("email", normalizedEmail);

  if (deleteError) {
    console.error("Failed to remove group member:", deleteError);
    return { error: deleteError.message };
  }

  await logActivity(supabase, {
    workspace_id: profile.workspace_id,
    action: "member_removed",
    entity_type: "meeting",
    entity_id: null,
    target_email: normalizedEmail,
    sharing_group_id: groupId,
    performed_by: user.id,
    details: { email: normalizedEmail },
  });

  revalidatePath("/settings");

  return { error: null };
}
