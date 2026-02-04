import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { SharePermission } from "@/types/share";

// GET /api/share/invite - List invitations for a meeting
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetingId = request.nextUrl.searchParams.get("meeting_id");
  if (!meetingId) {
    return NextResponse.json(
      { error: "meeting_id is required" },
      { status: 400 }
    );
  }

  // Get user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Verify meeting belongs to user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting } = await (supabase.from("meetings") as any)
    .select("id, workspace_id")
    .eq("id", meetingId)
    .single();

  if (!meeting || meeting.workspace_id !== profile.workspace_id) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Fetch invitations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitations, error } = await (supabase.from("meeting_share_invitations") as any)
    .select(
      `
      id,
      email,
      permission,
      status,
      expires_at,
      created_at,
      invited_by (
        full_name
      )
    `
    )
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invitations });
}

// POST /api/share/invite - Create and send a meeting share invitation
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's profile and check permissions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only admins and leaders can send invitations" },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await request.json();
  const { meeting_id, email, permission } = body as {
    meeting_id: string;
    email: string;
    permission: SharePermission;
  };

  if (!meeting_id || !email || !permission) {
    return NextResponse.json(
      { error: "meeting_id, email, and permission are required" },
      { status: 400 }
    );
  }

  if (!["viewer", "editor"].includes(permission)) {
    return NextResponse.json(
      { error: "permission must be viewer or editor" },
      { status: 400 }
    );
  }

  // Verify meeting belongs to user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting } = await (supabase.from("meetings") as any)
    .select(
      `
      id,
      workspace_id,
      title,
      workspaces (
        name,
        slug
      )
    `
    )
    .eq("id", meeting_id)
    .single();

  if (!meeting || meeting.workspace_id !== profile.workspace_id) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Check for existing pending invitation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingInvite } = await (supabase.from("meeting_share_invitations") as any)
    .select("id")
    .eq("meeting_id", meeting_id)
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return NextResponse.json(
      { error: "An invitation is already pending for this email" },
      { status: 400 }
    );
  }

  // Create invitation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation, error: insertError } = await (supabase.from("meeting_share_invitations") as any)
    .insert({
      meeting_id,
      email,
      permission,
      invited_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // TODO: Send email notification via Resend
  // For now, we'll just return the invitation
  // In a production app, you would integrate with Resend here

  return NextResponse.json(
    {
      invitation,
      message: "Invitation created successfully",
    },
    { status: 201 }
  );
}

// DELETE /api/share/invite - Revoke an invitation
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitationId = request.nextUrl.searchParams.get("id");
  if (!invitationId) {
    return NextResponse.json(
      { error: "invitation id is required" },
      { status: 400 }
    );
  }

  // Get user's profile
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
      { error: "Only admins and leaders can revoke invitations" },
      { status: 403 }
    );
  }

  // Verify invitation belongs to a meeting in user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation } = await (supabase.from("meeting_share_invitations") as any)
    .select(
      `
      id,
      meeting_id,
      meetings (
        workspace_id
      )
    `
    )
    .eq("id", invitationId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invitationWithMeeting = invitation as any;
  if (!invitation || invitationWithMeeting?.meetings?.workspace_id !== profile.workspace_id) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  // Update invitation status to revoked
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("meeting_share_invitations") as any)
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
