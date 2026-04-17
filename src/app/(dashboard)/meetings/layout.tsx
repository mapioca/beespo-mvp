import { Metadata } from "next"
import { MeetingsHubShell } from "@/components/meetings/hub"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Meetings | Beespo",
  description: "Your central workspace for meetings, plans, assignments, and announcements",
}

interface MeetingsLayoutProps {
  children: React.ReactNode
}

export default async function MeetingsLayout({ children }: MeetingsLayoutProps) {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)
  const isBishopric = isBishopricOrganization(organizationType)

  return <MeetingsHubShell isBishopric={isBishopric}>{children}</MeetingsHubShell>
}
