import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SpeakerPlannerClient } from "@/components/meetings/sacrament-meeting/speaker-planner-client"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Speaker Planner | Beespo",
  description: "Bishopric-only sacrament meeting speaker planner",
}

export default async function SpeakerPlannerPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)

  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  return <SpeakerPlannerClient />
}
