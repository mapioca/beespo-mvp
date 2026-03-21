import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MeetingsClient } from "@/components/meetings/meetings-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Agendas | Beespo",
  description: "Manage your meetings and agendas",
}

export const dynamic = "force-dynamic"

export default async function AgendasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await (
    supabase.from("profiles") as ReturnType<typeof supabase.from>
  )
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.workspace_id) {
    redirect("/onboarding")
  }

  const isLeader = profile.role === "leader" || profile.role === "admin"

  // Fetch workspace slug
  const { data: workspace } = await (
    supabase.from("workspaces") as ReturnType<typeof supabase.from>
  )
    .select("slug")
    .eq("id", profile.workspace_id)
    .single()
  const workspaceSlug: string | null = workspace?.slug || null

  // Fetch all meetings (no pagination — client handles filtering/scroll)
  const { data: meetings, error } = await supabase
    .from("meetings")
    .select(
      `*,
      templates (
        id,
        name
      )`
    )
    .eq("workspace_id", profile.workspace_id)
    .order("scheduled_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Meetings query error:", error)
    return (
      <div className="p-8">Error loading agendas. Please try again.</div>
    )
  }

  // Fetch all templates for filter dropdown
  const { data: templates } = await (
    supabase.from("templates") as ReturnType<typeof supabase.from>
  )
    .select("id, name")
    .order("name")

  // Compute counts for filter badges
  const statusCounts: Record<string, number> = {
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  }
  const templateCounts: Record<string, number> = {
    "no-template": 0,
  }

  meetings?.forEach((m: { status: string; template_id: string | null }) => {
    if (m.status in statusCounts) statusCounts[m.status]++
    if (m.template_id) {
      templateCounts[m.template_id] =
        (templateCounts[m.template_id] || 0) + 1
    } else {
      templateCounts["no-template"]++
    }
  })

  return (
    <MeetingsClient
      meetings={meetings || []}
      templates={templates || []}
      workspaceSlug={workspaceSlug}
      isLeader={isLeader}
      statusCounts={statusCounts}
      templateCounts={templateCounts}
    />
  )
}
