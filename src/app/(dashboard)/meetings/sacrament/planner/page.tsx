import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SacramentMeetingPlannerClient } from "@/components/meetings/sacrament-meeting/program-planner-client"
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

  const [{ data: profileData }, { data: workspace }] = await Promise.all([
    (supabase.from("profiles") as ReturnType<typeof supabase.from>)
      .select("language_preference")
      .eq("id", user.id)
      .single(),
    (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
      .select("name, unit_name")
      .eq("id", profile.workspace_id)
      .single(),
  ])

  const defaultLanguage: "ENG" | "SPA" = profileData?.language_preference ?? "ENG"
  const unitName = workspace?.unit_name || workspace?.name || "Ward"

  return <SacramentMeetingPlannerClient defaultLanguage={defaultLanguage} unitName={unitName} />
}
