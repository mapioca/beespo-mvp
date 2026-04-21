import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SacramentMeetingPlannerClient } from "@/components/meetings/sacrament-meeting/planner-client"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Program Planner | Beespo",
  description: "Bishopric-only sacrament meeting program planner",
}

export default async function SacramentMeetingPlannerPage() {
  const [{ user, profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)

  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (supabase.from("profiles") as any)
    .select("language_preference")
    .eq("id", user.id)
    .single()

  const defaultLanguage: "ENG" | "SPA" = profileData?.language_preference ?? "ENG"

  return <SacramentMeetingPlannerClient defaultLanguage={defaultLanguage} />
}
