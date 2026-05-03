import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ArchiveClient } from "@/components/meetings/sacrament-archive/archive-client"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { buildArchiveMeetingSummary } from "@/lib/sacrament-archive"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Sacrament Meeting Archive | Beespo",
  description: "Bishopric-only sacrament meeting archive",
}

export default async function SacramentMeetingArchivePage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)

  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  const today = new Date()
  const todayIsoDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)

  const { data, error } = await (supabase.from("sacrament_planner_entries") as ReturnType<typeof supabase.from>)
    .select("meeting_date, meeting_state, notes_state, updated_at")
    .eq("workspace_id", profile.workspace_id)
    .lt("meeting_date", todayIsoDate)
    .order("meeting_date", { ascending: false })

  if (error) {
    console.error("Archive query error:", error)
    return <div className="p-8">Error loading archive. Please try again.</div>
  }

  const meetings = ((data ?? []) as Array<{
    meeting_date: string
    meeting_state: unknown
    notes_state: unknown
    updated_at: string | null
  }>).map((entry) =>
    buildArchiveMeetingSummary({
      meetingDate: entry.meeting_date,
      meetingState: entry.meeting_state,
      notesState: entry.notes_state,
      updatedAt: entry.updated_at,
    })
  )

  return (
    <div className="min-h-full bg-surface-canvas">
      <Breadcrumbs />
      <ArchiveClient meetings={meetings} />
    </div>
  )
}
