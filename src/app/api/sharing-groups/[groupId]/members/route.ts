import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ── POST /api/sharing-groups/[groupId]/members — add a member ────────────────

const addMemberSchema = z.object({
  email: z.string().email(),
});

export async function POST(
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
      { error: "Only admins and leaders can add group members" },
      { status: 403 }
    );
  }

  // Verify group belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase.from("sharing_groups") as any)
    .select("id")
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member, error } = await (supabase.from("sharing_group_members") as any)
    .insert({
      group_id: groupId,
      email: normalizedEmail,
      added_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to add group member:", error);
    return NextResponse.json({ error: "Failed to add group member" }, { status: 500 });
  }

  // Fire-and-forget audit log
  try {
    await (supabase.from("share_activity_log") as any)
      .insert({
        workspace_id: profile.workspace_id,
        action: "member_added",
        entity_type: "meeting",
        entity_id: null,
        target_email: normalizedEmail,
        sharing_group_id: groupId,
        performed_by: user.id,
        details: { email: normalizedEmail },
      });
  } catch {}

  return NextResponse.json({ member }, { status: 201 });
}

// ── DELETE /api/sharing-groups/[groupId]/members — remove a member ───────────

export async function DELETE(
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
      { error: "Only admins and leaders can remove group members" },
      { status: 403 }
    );
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email query param is required" }, { status: 400 });
  }

  // Validate the email format
  const emailValidation = z.string().email().safeParse(email);
  if (!emailValidation.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Verify group belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group } = await (supabase.from("sharing_groups") as any)
    .select("id")
    .eq("id", groupId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: "Failed to revoke meeting shares before removing member" },
      { status: 500 }
    );
  }

  // Remove member from group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase.from("sharing_group_members") as any)
    .delete()
    .eq("group_id", groupId)
    .eq("email", normalizedEmail);

  if (deleteError) {
    console.error("Failed to remove group member:", deleteError);
    return NextResponse.json({ error: "Failed to remove group member" }, { status: 500 });
  }

  // Fire-and-forget audit log
  try {
    await (supabase.from("share_activity_log") as any)
      .insert({
        workspace_id: profile.workspace_id,
        action: "member_removed",
        entity_type: "meeting",
        entity_id: null,
        target_email: normalizedEmail,
        sharing_group_id: groupId,
        performed_by: user.id,
        details: { email: normalizedEmail },
      });
  } catch {}

  return NextResponse.json({ success: true });
}
