import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/share/[meetingId]/track-view - Track anonymous page views
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  const supabase = await createClient();

  try {
    const { meetingId } = await context.params;
    const body = await request.json();
    const { visitor_fingerprint, referrer, user_agent } = body;

    if (!visitor_fingerprint) {
      return NextResponse.json(
        { error: "visitor_fingerprint is required" },
        { status: 400 }
      );
    }

    // Verify meeting exists and is publicly shared
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting, error: meetingError } = await (supabase.from("meetings") as any)
      .select("id, is_publicly_shared")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (!meeting.is_publicly_shared) {
      return NextResponse.json(
        { error: "Meeting is not publicly shared" },
        { status: 403 }
      );
    }

    // Try to upsert view record
    // First check if view exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingView } = await (supabase.from("meeting_share_views") as any)
      .select("id, view_count")
      .eq("meeting_id", meetingId)
      .eq("visitor_fingerprint", visitor_fingerprint)
      .single();

    if (existingView) {
      // Update existing view record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from("meeting_share_views") as any)
        .update({
          view_count: (existingView.view_count || 1) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", existingView.id);

      if (updateError) {
        console.error("Failed to update view:", updateError);
        return NextResponse.json(
          { error: "Failed to track view" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        tracked: true,
        is_new_visitor: false,
      });
    } else {
      // Insert new view record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from("meeting_share_views") as any)
        .insert({
          meeting_id: meetingId,
          visitor_fingerprint,
          referrer: referrer || null,
          user_agent: user_agent || null,
          view_count: 1,
          first_viewed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Failed to insert view:", insertError);
        return NextResponse.json(
          { error: "Failed to track view" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        tracked: true,
        is_new_visitor: true,
      });
    }
  } catch (error) {
    console.error("Track view error:", error);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}
