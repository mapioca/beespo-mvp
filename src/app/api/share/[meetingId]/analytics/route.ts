import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { ShareAnalytics } from "@/types/share";

// GET /api/share/[meetingId]/analytics - Get share analytics
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await context.params;

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

  // Get analytics using the database function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: analyticsData, error: analyticsError } = await (supabase.rpc as any)(
    "get_meeting_share_analytics",
    { p_meeting_id: meetingId }
  );

  if (analyticsError) {
    console.error("Analytics error:", analyticsError);
    // Fall back to manual query if function fails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: views, error: viewsError } = await (supabase.from("meeting_share_views") as any)
      .select("view_count, first_viewed_at, last_viewed_at")
      .eq("meeting_id", meetingId);

    if (viewsError) {
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    const analytics: ShareAnalytics = {
      total_views: views?.reduce(
        (sum: number, v: { view_count: number }) => sum + (v.view_count || 0),
        0
      ) || 0,
      unique_visitors: views?.length || 0,
      first_view:
        views?.length > 0
          ? views.reduce(
              (earliest: string | null, v: { first_viewed_at: string }) =>
                !earliest || v.first_viewed_at < earliest
                  ? v.first_viewed_at
                  : earliest,
              null as string | null
            )
          : null,
      last_view:
        views?.length > 0
          ? views.reduce(
              (latest: string | null, v: { last_viewed_at: string }) =>
                !latest || v.last_viewed_at > latest
                  ? v.last_viewed_at
                  : latest,
              null as string | null
            )
          : null,
    };

    return NextResponse.json({ analytics });
  }

  const analytics: ShareAnalytics = analyticsData || {
    total_views: 0,
    unique_visitors: 0,
    first_view: null,
    last_view: null,
  };

  // Get invitation stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitations } = await (supabase.from("meeting_share_invitations") as any)
    .select("status")
    .eq("meeting_id", meetingId);

  const invitationStats = {
    total: invitations?.length || 0,
    pending: invitations?.filter((i: { status: string }) => i.status === "pending").length || 0,
    accepted: invitations?.filter((i: { status: string }) => i.status === "accepted").length || 0,
    revoked: invitations?.filter((i: { status: string }) => i.status === "revoked").length || 0,
    expired: invitations?.filter((i: { status: string }) => i.status === "expired").length || 0,
  };

  return NextResponse.json({
    analytics,
    invitations: invitationStats,
  });
}
