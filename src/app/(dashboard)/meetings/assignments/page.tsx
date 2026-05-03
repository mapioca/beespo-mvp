import { Metadata } from "next"

import { AssignmentsClient } from "@/components/assignments/assignments-client"
import { createClient } from "@/lib/supabase/server"
import { AssignmentView } from "@/lib/table-views"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"

export const metadata: Metadata = {
  title: "Assignments | Beespo",
  description: "Track meeting assignments across your workspace",
}

export default async function AssignmentsPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])

  // Step 1: fetch raw assignment rows only (no nested joins).
  const { data: assignmentsData, error: assignmentsError } = await (
    supabase.from("meeting_assignments") as ReturnType<typeof supabase.from>
  )
    .select(
      "id, directory_id, meeting_id, agenda_item_id, assignment_type, topic, is_confirmed, created_at"
    )
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false })

  if (assignmentsError) {
    console.error("Assignments query error:", assignmentsError, JSON.stringify(assignmentsError))
    return <div className="p-8">Error loading assignments. Please try again.</div>
  }

  type AssignmentRow = {
    id: string
    directory_id: string | null
    meeting_id: string | null
    agenda_item_id: string | null
    assignment_type: string
    topic: string | null
    is_confirmed: boolean
    created_at: string
  }

  const assignmentRows = (assignmentsData ?? []) as AssignmentRow[]

  // Step 2: load directory names.
  const directoryIds = Array.from(
    new Set(assignmentRows.map((row) => row.directory_id).filter((id): id is string => Boolean(id)))
  )
  const { data: directoryData, error: directoryError } = directoryIds.length
    ? await (supabase.from("directory") as ReturnType<typeof supabase.from>)
        .select("id, name")
        .eq("workspace_id", profile.workspace_id)
        .in("id", directoryIds)
    : { data: [], error: null }

  if (directoryError) {
    console.error("Assignments directory lookup error:", directoryError, JSON.stringify(directoryError))
    return <div className="p-8">Error loading assignments. Please try again.</div>
  }

  const directoryById = new Map<string, { id: string; name: string }>(
    ((directoryData ?? []) as Array<{ id: string; name: string }>).map((entry) => [entry.id, entry])
  )

  // Step 3: load agenda item metadata.
  const agendaItemIds = Array.from(
    new Set(assignmentRows.map((row) => row.agenda_item_id).filter((id): id is string => Boolean(id)))
  )
  const { data: agendaItemsData, error: agendaItemsError } = agendaItemIds.length
    ? await (supabase.from("agenda_items") as ReturnType<typeof supabase.from>)
        .select("id, title, meeting_id")
        .in("id", agendaItemIds)
    : { data: [], error: null }

  if (agendaItemsError) {
    console.error("Assignments agenda item lookup error:", agendaItemsError, JSON.stringify(agendaItemsError))
    return <div className="p-8">Error loading assignments. Please try again.</div>
  }

  const agendaItemById = new Map<string, { id: string; title: string; meeting_id: string | null }>(
    ((agendaItemsData ?? []) as Array<{ id: string; title: string; meeting_id: string | null }>).map((item) => [item.id, item])
  )

  // Step 4: load meeting metadata.
  const meetingIds = Array.from(
    new Set(
      assignmentRows
        .flatMap((row) => {
          const agendaMeetingId = row.agenda_item_id ? agendaItemById.get(row.agenda_item_id)?.meeting_id ?? null : null
          return [row.meeting_id, agendaMeetingId]
        })
        .filter((id): id is string => Boolean(id))
    )
  )

  const { data: meetingsData, error: meetingsError } = meetingIds.length
    ? await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, title, scheduled_date")
        .eq("workspace_id", profile.workspace_id)
        .in("id", meetingIds)
    : { data: [], error: null }

  if (meetingsError) {
    console.error("Assignments meeting lookup error:", meetingsError, JSON.stringify(meetingsError))
    return <div className="p-8">Error loading assignments. Please try again.</div>
  }

  const meetingById = new Map<string, { id: string; title: string; scheduled_date: string | null }>(
    ((meetingsData ?? []) as Array<{ id: string; title: string; scheduled_date: string | null }>).map((meeting) => [
      meeting.id,
      meeting,
    ])
  )

  const assignments = assignmentRows.map((row) => {
    const agendaItem = row.agenda_item_id ? agendaItemById.get(row.agenda_item_id) ?? null : null
    const meetingId = row.meeting_id ?? agendaItem?.meeting_id ?? null
    const meeting = meetingId ? meetingById.get(meetingId) ?? null : null

    return {
      id: row.id,
      assignment_type: row.assignment_type,
      topic: row.topic,
      is_confirmed: row.is_confirmed,
      created_at: row.created_at,
      directory: row.directory_id ? directoryById.get(row.directory_id) ?? null : null,
      agenda_item: agendaItem
        ? {
            id: agendaItem.id,
            title: agendaItem.title,
            meeting: meeting
              ? {
                  id: meeting.id,
                  title: meeting.title,
                  scheduled_date: meeting.scheduled_date,
                }
              : null,
          }
        : null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignmentViewsData } = await (supabase.from("agenda_views") as any)
    .select("id, workspace_id, created_by, name, view_type, filters, created_at, updated_at")
    .eq("workspace_id", profile.workspace_id)
    .eq("view_type", "assignments")
    .order("created_at", { ascending: true })

  const initialViews: AssignmentView[] = assignmentViewsData ?? []

  return <AssignmentsClient assignments={assignments} initialViews={initialViews} />
}
