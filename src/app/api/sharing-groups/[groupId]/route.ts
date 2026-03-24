import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SharingGroupWithMembers } from "@/types/share";

// ── GET /api/sharing-groups/[groupId] — single group with members ─────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
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

  if (error || !group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const groupWithCount: SharingGroupWithMembers = {
    ...group,
    member_count: group.members?.length ?? 0,
  };

  return NextResponse.json({ group: groupWithCount });
}

// ── PUT /api/sharing-groups/[groupId] — update group name/description ─────────

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only admins and leaders can update sharing groups" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description } = parsed.data;

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
    return NextResponse.json({ error: "Failed to update sharing group" }, { status: 500 });
  }

  // Fire-and-forget audit log
  try {
    await (supabase.from("share_activity_log") as any)
      .insert({
        workspace_id: profile.workspace_id,
        action: "group_updated",
        entity_type: "meeting",
        entity_id: null,
        target_email: null,
        sharing_group_id: groupId,
        performed_by: user.id,
        details: { updated_fields: Object.keys(updates).filter((k) => k !== "updated_at") },
      });
  } catch {}

  return NextResponse.json({ success: true });
}

// ── DELETE /api/sharing-groups/[groupId] — delete group ──────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only admins and leaders can delete sharing groups" },
      { status: 403 }
    );
  }

  // Verify group belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase.from("sharing_groups") as any)
    .select("id, name")
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Revoke all active meeting shares associated with this group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: revokeError } = await (supabase.from("meeting_shares") as any)
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("sharing_group_id", groupId)
    .eq("status", "active");

  if (revokeError) {
    console.error("Failed to revoke meeting shares for group:", revokeError);
    return NextResponse.json(
      { error: "Failed to revoke meeting shares before deletion" },
      { status: 500 }
    );
  }

  // Delete group (cascade removes sharing_group_members)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase.from("sharing_groups") as any)
    .delete()
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id);

  if (deleteError) {
    console.error("Failed to delete sharing group:", deleteError);
    return NextResponse.json({ error: "Failed to delete sharing group" }, { status: 500 });
  }

  // Fire-and-forget audit log
  try {
    await (supabase.from("share_activity_log") as any)
      .insert({
        workspace_id: profile.workspace_id,
        action: "revoked",
        entity_type: "meeting",
        entity_id: null,
        target_email: null,
        sharing_group_id: groupId,
        performed_by: user.id,
        details: { group_name: group.name, reason: "group_deleted" },
      });
  } catch {}

  return NextResponse.json({ success: true });
}
