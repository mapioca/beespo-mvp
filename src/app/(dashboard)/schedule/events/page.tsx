import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { EventsListClient, type EventListItem } from "@/components/calendar/events"
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"

export const metadata: Metadata = {
    title: "Events | Beespo",
    description: "View and manage all your calendar events",
}

export default async function ScheduleEventsPage() {
    const [{ profile }, supabase] = await Promise.all([
        getDashboardRequestContext(),
        createClient(),
    ])

    const today = new Date()
    const rangeStart = subMonths(startOfMonth(today), 3).toISOString()
    const rangeEnd = addMonths(endOfMonth(today), 6).toISOString()

    const { data: events } = await (
        supabase.from("events") as ReturnType<typeof supabase.from>
    )
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
      workspace_event_id,
      external_source_id,
      external_source_type,
      meetings!event_id (
        id,
        title,
        status,
        plan_type
      )
    `)
        .eq("workspace_id", profile.workspace_id)
        .gte("start_at", rangeStart)
        .lte("start_at", rangeEnd)
        .order("start_at", { ascending: true })

    const eventItems: EventListItem[] = (events || []).map((event: {
        id: string
        title: string
        event_type?: "interview" | "meeting" | "activity"
        description: string | null
        location: string | null
        start_at: string
        end_at: string
        is_all_day: boolean
        date_tbd?: boolean
        time_tbd?: boolean
        duration_mode?: "minutes" | "tbd" | "all_day"
        duration_minutes?: number | null
        workspace_event_id: string | null
        external_source_id: string | null
        external_source_type: string | null
        meetings?: Array<{
            id: string
            title: string
            status: string
            plan_type: "agenda" | "program" | null
        }> | null
    }) => ({
        id: event.id,
        title: event.title,
        event_type: event.event_type ?? "activity",
        description: event.description,
        location: event.location,
        start_at: event.start_at,
        end_at: event.end_at,
        is_all_day: event.is_all_day,
        date_tbd: event.date_tbd ?? false,
        time_tbd: event.time_tbd ?? false,
        duration_mode: event.duration_mode ?? (event.is_all_day ? "all_day" : "minutes"),
        duration_minutes: event.duration_minutes ?? null,
        workspace_event_id: event.workspace_event_id,
        external_source_id: event.external_source_id,
        external_source_type: event.external_source_type,
        source_type: "event" as const,
        linkedMeeting: event.meetings?.[0]
            ? {
                id: event.meetings[0].id,
                title: event.meetings[0].title,
                status: event.meetings[0].status,
                plan_type: event.meetings[0].plan_type,
            }
            : null,
    }))

    const canManageEvents = profile.role === "admin" || profile.role === "leader"

    return <EventsListClient events={eventItems} canManageEvents={canManageEvents} />
}
