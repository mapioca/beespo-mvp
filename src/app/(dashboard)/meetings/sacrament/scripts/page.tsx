import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ConductScriptsClient } from "@/components/meetings/sacrament-meeting/conduct-scripts-client"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"
import type { ConductScriptKey } from "@/lib/conduct-script-templates"

export const metadata: Metadata = {
  title: "Conducting Scripts | Beespo",
  description: "Workspace defaults for sacrament meeting conducting scripts",
}

export default async function SacramentMeetingScriptsPage() {
  const [{ user, profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)

  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  const { data: profileData } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("language_preference")
    .eq("id", user.id)
    .single()
  const defaultLanguage: "ENG" | "SPA" = profileData?.language_preference ?? "ENG"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: templates } = await (supabase.from("conduct_script_templates") as any)
    .select("script_key, template")
    .eq("workspace_id", profile.workspace_id)
    .eq("language", defaultLanguage)

  return (
    <ConductScriptsClient
      workspaceId={profile.workspace_id}
      userId={user.id}
      defaultLanguage={defaultLanguage}
      initialTemplates={(templates ?? []) as Array<{ script_key: ConductScriptKey; template: string }>}
    />
  )
}
