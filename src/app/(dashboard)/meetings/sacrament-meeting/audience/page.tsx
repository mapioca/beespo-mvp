import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SacramentMeetingAudienceClient } from "@/components/meetings/sacrament-meeting/audience-client"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Sacrament Meeting Audience | Beespo",
  description: "Bishopric-only sacrament meeting audience workspace",
}

export default async function SacramentMeetingAudiencePage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const [{ data: workspace }, organizationType] = await Promise.all([
    (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
      .select("name, unit_name")
      .eq("id", profile.workspace_id)
      .single(),
    getWorkspaceOrganizationType(supabase, profile.workspace_id),
  ])

  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  return <SacramentMeetingAudienceClient unitName={workspace?.unit_name || workspace?.name || "Ward"} />
}
