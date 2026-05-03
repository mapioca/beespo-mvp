import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { EventDetailsPageClient } from "@/components/calendar/events/event-details-page-client";

type PlanType = "agenda" | "program";
type Modality = "online" | "in_person" | "hybrid";

interface LinkedMeeting {
  id: string;
  title: string;
  status: string;
  plan_type: PlanType | null;
  modality: Modality | null;
  workspace_meeting_id: string | null;
}

interface EventDetail {
  id: string;
  title: string;
  event_type: string | null;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  date_tbd: boolean | null;
  time_tbd: boolean | null;
  duration_mode: string | null;
  duration_minutes: number | null;
  meetings: LinkedMeeting[] | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
    .select("title")
    .eq("id", id)
    .single();
  const title = (data as { title?: string } | null)?.title ?? "Event";
  return { title: `${title} | Beespo` };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const { data, error } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
    .select(`
      id,
      title,
      event_type,
      description,
      location,
      start_at,
      end_at,
      is_all_day,
      date_tbd,
      time_tbd,
      duration_mode,
      duration_minutes,
      meetings!event_id (
        id,
        title,
        status,
        plan_type,
        modality,
        workspace_meeting_id
      )
    `)
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (error || !data) notFound();

  const event = data as unknown as EventDetail;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Breadcrumbs
        items={[
          { label: "Events", href: "/schedule/events" },
          { label: event.title },
        ]}
      />
      <EventDetailsPageClient
        event={{
          id: event.id,
          title: event.title,
          event_type: event.event_type,
          description: event.description,
          location: event.location,
          start_at: event.start_at,
          end_at: event.end_at,
          is_all_day: event.is_all_day,
          date_tbd: event.date_tbd,
          time_tbd: event.time_tbd,
          duration_mode: event.duration_mode,
          duration_minutes: event.duration_minutes,
        }}
        meeting={event.meetings?.[0] ?? null}
      />
    </div>
  );
}
