import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SacramentMeetingPlannerClient } from "@/components/meetings/sacrament-meeting/planner-client"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Sacrament Meeting Planner | Beespo",
  description: "Bishopric-only sacrament meeting planner",
}

export default async function SacramentMeetingPlannerPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)

  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  return <SacramentMeetingPlannerClient />
}
