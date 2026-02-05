import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LiveMeetingView } from "./live-meeting-view";
import type { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface PublicMeetingPageProps {
  params: Promise<{
    "workspace-slug": string;
    id: string;
  }>;
}

interface MeetingData extends Meeting {
  workspaces: { slug: string | null; name: string | null };
}



// Generate dynamic metadata for the page title
export async function generateMetadata({
  params,
}: PublicMeetingPageProps): Promise<Metadata> {
  const { id: meetingId } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting } = await (supabase.from("meetings") as any)
    .select("title")
    .eq("id", meetingId)
    .eq("is_publicly_shared", true)
    .single();

  return {
    title: meeting?.title || "Meeting",
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default async function PublicMeetingPage({
  params,
}: PublicMeetingPageProps) {
  const { "workspace-slug": workspaceSlug, id: meetingId } = await params;

  const supabase = await createClient();

  // Fetch meeting with workspace verification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting, error: meetingError } = await (supabase.from("meetings") as any)
    .select(`
      *,
      workspaces!inner(slug, name)
    `)
    .eq("id", meetingId)
    .eq("is_publicly_shared", true)
    .single() as { data: MeetingData | null; error: unknown };

  if (meetingError || !meeting) {
    notFound();
  }

  // Verify workspace slug matches
  if (meeting.workspaces?.slug !== workspaceSlug) {
    notFound();
  }

  // Fetch agenda items with hymn data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase.from("agenda_items") as any)
    .select(`
      *,
      hymns (
        title,
        hymn_number
      )
    `)
    .eq("meeting_id", meetingId)
    .order("order_index");

  // Remove workspace join data for the client component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { workspaces, ...meetingData } = meeting;
  const cleanMeeting = meetingData as Meeting;

  return (
    <LiveMeetingView
      meetingId={meetingId}
      initialMeeting={cleanMeeting}
      initialAgendaItems={items || []}
    />
  );
}
