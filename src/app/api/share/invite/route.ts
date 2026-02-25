import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { SharePermission } from "@/types/share";
import { sendMeetingShareInviteEmail } from "@/lib/email/send-meeting-share-email";
import type { UserRole } from "@/types/database";

interface ProfileResult {
  workspace_id: string | null;
  role: UserRole;
  full_name: string | null;
}

interface MeetingResult {
  id: string;
  workspace_id: string;
  title: string;
  workspaces?: {
    name: string;
    slug: string;
  } | null;
}

interface InvitationResult {
  id: string;
  email: string;
  permission: SharePermission;
  status: string;
  expires_at: string | null;
  created_at: string;
  token?: string | null;
  profiles: {
    full_name: string | null;
  } | null;
}

interface SupabaseError {
  message: string;
}

interface DeletionInvitationResult {
  id: string;
  meeting_id: string;
  meetings: {
    workspace_id: string;
  } | null;
}

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!(profile as unknown as ProfileResult)?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Verify meeting belongs to user's workspace
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, workspace_id")
    .eq("id", meetingId)
    .single();

  if (!meeting || (meeting as unknown as MeetingResult).workspace_id !== (profile as unknown as ProfileResult).workspace_id) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Fetch invitations
  const { data: invitations, error } = await supabase
    .from("meeting_share_invitations")
    .select(
      `
      id,
      email,
      permission,
      status,
      expires_at,
      created_at,
      profiles:invited_by (
        full_name
      )
    `
    )
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Handle invitation type for the frontend/response if needed
  const formattedInvitations = (invitations as unknown as InvitationResult[] || []).map(inv => ({
    ...inv,
    invited_by: inv.profiles
  }));

  return NextResponse.json({ invitations: formattedInvitations });
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!(profile as unknown as ProfileResult)?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes((profile as unknown as ProfileResult).role)) {
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
  const { data: meeting } = await supabase
    .from("meetings")
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

  if (!meeting || (meeting as unknown as MeetingResult).workspace_id !== (profile as unknown as ProfileResult).workspace_id) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("meeting_share_invitations")
    .select("id")
    .eq("meeting_id", meeting_id)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json(
      { error: "An invitation is already pending for this email" },
      { status: 400 }
    );
  }

  // Create invitation
  const { data: invitation, error: insertError } = await (supabase as unknown as {
    from: (t: string) => {
      insert: (v: Record<string, unknown>) => {
        select: () => {
          single: () => Promise<{ data: InvitationResult | null; error: SupabaseError | null }>;
        };
      };
    };
  })
    .from("meeting_share_invitations")
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

  // Send email notification via Resend
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const workspaceData = (meeting as unknown as MeetingResult)?.workspaces;
  const inviteLink = invitation?.token ? `${appUrl}/api/share/invite/${invitation.token}` : "";

  const emailResult = await sendMeetingShareInviteEmail({
    toEmail: email,
    inviterName: (profile as unknown as ProfileResult)?.full_name || "Someone",
    meetingTitle: (meeting as unknown as MeetingResult).title || "A meeting",
    workspaceName: workspaceData?.name || "Beespo",
    permission,
    inviteLink,
  });

  if (!emailResult.success) {
    console.error("Failed to send meeting share email:", emailResult.error);
    // Non-blocking: invitation was still created successfully
  }

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!(profile as unknown as ProfileResult)?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes((profile as unknown as ProfileResult).role)) {
    return NextResponse.json(
      { error: "Only admins and leaders can revoke invitations" },
      { status: 403 }
    );
  }

  // Verify invitation belongs to a meeting in user's workspace
  const { data: invitation } = await supabase
    .from("meeting_share_invitations")
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

  const invitationWithMeeting = invitation as unknown as DeletionInvitationResult;
  if (!invitation || invitationWithMeeting?.meetings?.workspace_id !== (profile as unknown as ProfileResult).workspace_id) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  // Update invitation status to revoked
  const { error: updateError } = await (supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, val: string) => Promise<{ error: SupabaseError | null }>;
      };
    };
  })
    .from("meeting_share_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
