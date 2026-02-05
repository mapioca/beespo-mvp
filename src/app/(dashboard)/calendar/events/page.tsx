import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Metadata } from "next"
import { EventsListClient, type EventListItem } from "@/components/calendar/events"
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"

export const metadata: Metadata = {
    title: "Events | Beespo",
    description: "View and manage all your calendar events",
}

export const revalidate = 0

export default async function EventsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Get user profile
    const { data: profile } = await (
        supabase.from("profiles") as ReturnType<typeof supabase.from>
    )
        .select("workspace_id, role")
        .eq("id", user.id)
        .single()

    if (!profile || !profile.workspace_id) {
        redirect("/setup")
    }

    // Fetch date range: 3 months back to 6 months forward for events list
    const today = new Date()
    const rangeStart = subMonths(startOfMonth(today), 3).toISOString()
    const rangeEnd = addMonths(endOfMonth(today), 6).toISOString()

    // Fetch internal events
    const { data: events } = await (
        supabase.from("events") as ReturnType<typeof supabase.from>
    )
        .select(`
      id,
      title,
      description,
      location,
      start_at,
      end_at,
      is_all_day,
      workspace_event_id,
      external_source_id,
      external_source_type
    `)
        .eq("workspace_id", profile.workspace_id)
        .gte("start_at", rangeStart)
        .lte("start_at", rangeEnd)
        .order("start_at", { ascending: true })

    // Fetch meetings
    const { data: meetings } = await (
        supabase.from("meetings") as ReturnType<typeof supabase.from>
    )
        .select("id, title, scheduled_date, status")
        .eq("workspace_id", profile.workspace_id)
        .gte("scheduled_date", rangeStart)
        .lte("scheduled_date", rangeEnd)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true })

    // Transform events to unified format
    const eventItems: EventListItem[] = (events || []).map((event: {
        id: string
        title: string
        description: string | null
        location: string | null
        start_at: string
        end_at: string
        is_all_day: boolean
        workspace_event_id: string | null
        external_source_id: string | null
        external_source_type: string | null
    }) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_at: event.start_at,
        end_at: event.end_at,
        is_all_day: event.is_all_day,
        workspace_event_id: event.workspace_event_id,
        external_source_id: event.external_source_id,
        external_source_type: event.external_source_type,
        source_type: "event" as const,
    }))

    // Transform meetings to unified format
    const meetingItems: EventListItem[] = (meetings || []).map((meeting: {
        id: string
        title: string
        scheduled_date: string
        status: string
    }) => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        description: `Status: ${meeting.status}`,
        location: null,
        start_at: meeting.scheduled_date,
        end_at: meeting.scheduled_date, // Meetings are typically single-day events
        is_all_day: false,
        workspace_event_id: null,
        external_source_id: null,
        external_source_type: null,
        source_type: "meeting" as const,
        source_id: meeting.id,
    }))

    // Combine and sort all events
    const allEvents = [...eventItems, ...meetingItems].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    )

    return <EventsListClient events={allEvents} />
}
