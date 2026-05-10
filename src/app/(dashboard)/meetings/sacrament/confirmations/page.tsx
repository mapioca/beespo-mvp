import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ConfirmationsClient } from "@/components/meetings/sacrament-meeting/confirmations-client"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import {
  getUpcomingSundayIsoDates,
  parseMeetingConfirmations,
  type ConfirmationAssignment,
} from "@/lib/sacrament-confirmations"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Confirmations | Beespo",
  description: "Track pending speaker and prayer confirmations",
}

const HORIZON_SUNDAYS = 8
const RECENT_DECLINE_LOOKBACK_SUNDAYS = 8

type SacramentPlannerEntryRow = {
  meeting_date: string
  meeting_state: unknown
}

export default async function ConfirmationsPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)
  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  const upcoming = getUpcomingSundayIsoDates(HORIZON_SUNDAYS)
  const past = getUpcomingSundayIsoDates(RECENT_DECLINE_LOOKBACK_SUNDAYS, addWeeks(new Date(), -RECENT_DECLINE_LOOKBACK_SUNDAYS))
    .filter((date) => date < upcoming[0])
  const dates = [...past, ...upcoming]

  const { data } = await (supabase.from("sacrament_planner_entries") as ReturnType<typeof supabase.from>)
    .select("meeting_date, meeting_state")
    .eq("workspace_id", profile.workspace_id)
    .in("meeting_date", dates)

  const rows = (data ?? []) as SacramentPlannerEntryRow[]
  const assignments: ConfirmationAssignment[] = rows.flatMap((row) =>
    parseMeetingConfirmations(row.meeting_state, row.meeting_date)
  )

  return (
    <ConfirmationsClient
      initialAssignments={assignments}
      upcomingDates={upcoming}
    />
  )
}

function addWeeks(date: Date, weeks: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + weeks * 7)
  return next
}
