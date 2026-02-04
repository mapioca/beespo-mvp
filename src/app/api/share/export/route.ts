import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateExport } from "@/lib/share/distribution-engine";
import {
  sanitizeMeetingForPublic,
  sanitizeAgendaItemsForPublic,
  applyShareSettings,
} from "@/lib/share/sanitize-public-data";
import { getPublicMeetingUrl } from "@/lib/slug-helpers";
import type { ExportFormat, MeetingShareSettings } from "@/types/share";

// POST /api/share/export - Generate meeting export in various formats
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { meeting_id, format, include_url = true } = body as {
      meeting_id: string;
      format: ExportFormat;
      include_url?: boolean;
    };

    if (!meeting_id || !format) {
      return NextResponse.json(
        { error: "meeting_id and format are required" },
        { status: 400 }
      );
    }

    if (!["markdown", "html", "ics"].includes(format)) {
      return NextResponse.json(
        { error: "format must be one of: markdown, html, ics" },
        { status: 400 }
      );
    }

    // Check if user has access to this meeting (authenticated) or if meeting is public
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch meeting
    const { data: meeting, error: meetingError } = await (
      supabase.from("meetings") as ReturnType<typeof supabase.from>
    )
      .select(
        `
        *,
        workspaces (
          slug,
          name
        )
      `
      )
      .eq("id", meeting_id)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check access: either authenticated user in workspace or public meeting
    const meetingWithWorkspace = meeting as typeof meeting & {
      workspaces: { slug: string; name: string } | null;
    };

    if (!meeting.is_publicly_shared) {
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      if (!profile || profile.workspace_id !== meeting.workspace_id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Fetch agenda items
    const { data: items, error: itemsError } = await (
      supabase.from("agenda_items") as ReturnType<typeof supabase.from>
    )
      .select("*")
      .eq("meeting_id", meeting_id)
      .order("order_index", { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to fetch agenda items" },
        { status: 500 }
      );
    }

    // Fetch share settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings } = await (supabase.from("meeting_share_settings") as any)
      .select("*")
      .eq("meeting_id", meeting_id)
      .single();

    // Sanitize data
    const publicMeeting = sanitizeMeetingForPublic(meeting);
    let publicItems = sanitizeAgendaItemsForPublic(items || []);
    publicItems = applyShareSettings(publicItems, settings as MeetingShareSettings | null);

    // Generate public URL if requested
    let publicUrl: string | undefined;
    if (include_url && meetingWithWorkspace.workspaces?.slug) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      publicUrl = getPublicMeetingUrl(
        meetingWithWorkspace.workspaces.slug,
        meeting_id,
        baseUrl
      );
    }

    // Generate export
    const exportResult = generateExport(format, publicMeeting, publicItems, publicUrl);

    return NextResponse.json(exportResult);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}
