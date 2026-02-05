import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/share/invite/[token] - Accept invitation and redirect to meeting
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient();

  const { token } = await context.params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Find the invitation by token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation, error: inviteError } = await (supabase.from("meeting_share_invitations") as any)
    .select(
      `
      id,
      meeting_id,
      email,
      permission,
      status,
      expires_at,
      meetings (
        id,
        title,
        is_publicly_shared,
        workspaces (
          slug
        )
      )
    `
    )
    .eq("token", token)
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 404 }
    );
  }

  // Check invitation status
  if (invitation.status === "revoked") {
    return NextResponse.json(
      { error: "This invitation has been revoked" },
      { status: 403 }
    );
  }

  if (invitation.status === "expired") {
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 403 }
    );
  }

  // Check if invitation has expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Update status to expired
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("meeting_share_invitations") as any)
      .update({ status: "expired" })
      .eq("id", invitation.id);

    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 403 }
    );
  }

  // Mark invitation as accepted
  if (invitation.status === "pending") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("meeting_share_invitations") as any)
      .update({
        status: "accepted",
      })
      .eq("id", invitation.id);
  }

  // Get meeting and workspace info for redirect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meetingInfo = invitation.meetings as any;
  const workspaceSlug = meetingInfo?.workspaces?.slug;

  if (!workspaceSlug) {
    return NextResponse.json(
      { error: "Meeting workspace not found" },
      { status: 500 }
    );
  }

  // Build redirect URL to the public meeting page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = `${baseUrl}/${workspaceSlug}/meeting/${invitation.meeting_id}`;

  // Redirect user to the meeting page
  return NextResponse.redirect(redirectUrl);
}
