"use server";

import { addHours, format, startOfHour } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  createEventAndMeetingSchema,
  linkMeetingToEventSchema,
  type CreateEventAndMeetingInput,
  type LinkMeetingToEventInput,
} from "@/lib/validations/event-meeting";
import { canEdit } from "@/lib/auth/role-permissions";

export async function quickCreateMeeting(): Promise<
  { meetingId: string } | { error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized" };

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) return { error: "No workspace found" };
  if (!canEdit((profile as { role: string }).role)) {
    return { error: "You do not have permission to create meetings" };
  }

  const now = new Date();
  const start = addHours(startOfHour(now), 1);
  const end = addHours(start, 1);
  const title = `Meeting - ${format(now, "MMM d, yyyy")}`;

  const { data: rpcData, error: rpcError } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>
    ) => Promise<{
      data: { event_id: string; meeting_id: string } | null;
      error: { message: string } | null;
    }>
  )("create_event_and_meeting", {
    p_event_title: title,
    p_event_start_at: start.toISOString(),
    p_event_end_at: end.toISOString(),
    p_event_description: null,
    p_event_location: null,
    p_event_is_all_day: false,
    p_meeting_title: title,
    p_meeting_plan_type: null,
    p_template_id: null,
    p_meeting_modality: null,
  });

  if (rpcError || !rpcData) {
    return { error: rpcError?.message ?? "Failed to create meeting" };
  }

  const { error: metadataError } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
    .update({
      event_type: "meeting",
      date_tbd: true,
      time_tbd: true,
      duration_mode: "tbd",
      duration_minutes: null,
    })
    .eq("id", rpcData.event_id);

  if (metadataError) return { error: metadataError.message };

  return { meetingId: rpcData.meeting_id };
}

export async function createEventAndMeeting(input: CreateEventAndMeetingInput) {
  const parsed = createEventAndMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const payload = parsed.data;
  const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: { event_id: string; meeting_id: string } | null; error: { message: string } | null }>)(
    "create_event_and_meeting",
    {
      p_event_title: payload.title,
      p_event_start_at: payload.start_at,
      p_event_end_at: payload.end_at,
      p_event_description: payload.description ?? null,
      p_event_location: payload.location ?? null,
      p_event_is_all_day: payload.is_all_day ?? false,
      p_meeting_title: payload.meeting?.title ?? null,
      p_meeting_plan_type: payload.meeting?.plan_type ?? null,
      p_template_id: payload.meeting?.template_id ?? null,
      p_meeting_modality: payload.meeting?.modality ?? null,
    }
  );

  if (error) return { error: error.message };
  return { data };
}

export async function linkMeetingToEvent(input: LinkMeetingToEventInput) {
  const parsed = linkMeetingToEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }>)(
    "link_meeting_to_event",
    {
      p_event_id: parsed.data.event_id,
      p_meeting_title: parsed.data.title ?? null,
      p_plan_type: parsed.data.plan_type ?? null,
      p_template_id: parsed.data.template_id ?? null,
    }
  );

  if (error) return { error: error.message };
  return { data };
}

export async function getEventWithMeeting(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      meetings!event_id (
        id,
        title,
        status,
        event_id,
        is_legacy,
        plan_type,
        workspace_meeting_id
      )
    `)
    .eq("id", eventId)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getMeetingWithEvent(meetingId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      event:events!event_id (
        id,
        title,
        description,
        location,
        start_at,
        end_at,
        is_all_day,
        workspace_event_id
      )
    `)
    .eq("id", meetingId)
    .single();

  if (error) return { error: error.message };
  return { data };
}
