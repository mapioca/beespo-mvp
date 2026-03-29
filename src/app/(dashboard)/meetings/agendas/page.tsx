import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MeetingsClient } from "@/components/meetings/meetings-client"
import { Metadata } from "next"
import { AgendaView } from "@/lib/agenda-views"

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

  // Fetch meetings shared WITH the current user (cross-workspace)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inboundShareData } = await (supabase as any)
    .from("meeting_shares")
    .select(
      `
      id,
      permission,
      meeting_id,
        meetings!meeting_id (
        id, workspace_id, title, description, scheduled_date, status, is_publicly_shared,
        created_by, notes, created_at, updated_at,
        templates (id, name),
        workspaces (name, slug)
      ),
      shared_by_profile:shared_by (full_name)
    `
    )
    .eq("recipient_user_id", user.id)
    .eq("status", "active")

  // Fetch meeting IDs that the current user has shared outward
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outboundShareData } = await (supabase as any)
    .from("meeting_shares")
    .select("meeting_id")
    .eq("shared_by", user.id)
    .eq("status", "active")

  // Build annotated shared-with-me meeting list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedMeetings = (inboundShareData || []).flatMap((share: any) => {
    const m = share.meetings
    if (!m) return []
    return [
      {
        ...m,
        templates: m.templates || null,
        _shareType: "shared_with_me" as const,
        _sharePermission: share.permission,
        _sharedByName: share.shared_by_profile?.full_name ?? undefined,
        _sharedFromWorkspace: m.workspaces?.name ?? undefined,
      },
    ]
  })

  // Build Set of outward-shared meeting IDs (serialised as array for client)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedOutwardIds: string[] = (outboundShareData || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any) => row.meeting_id
  )

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

  // Fetch workspace-scoped custom agenda views (RLS enforces workspace isolation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agendaViewsData } = await (supabase.from("agenda_views") as any)
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .eq("view_type", "agendas")
    .order("created_at", { ascending: true })

  const initialViews: AgendaView[] = agendaViewsData ?? []

  return (
    <MeetingsClient
      meetings={meetings || []}
      templates={templates || []}
      workspaceSlug={workspaceSlug}
      isLeader={isLeader}
      statusCounts={statusCounts}
      templateCounts={templateCounts}
      sharedMeetings={sharedMeetings}
      sharedOutwardIds={sharedOutwardIds}
      initialViews={initialViews}
    />
  )
}
