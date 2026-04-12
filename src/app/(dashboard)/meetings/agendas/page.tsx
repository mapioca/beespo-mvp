import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MeetingsClient } from "@/components/meetings/meetings-client"
import { Metadata } from "next"
import { AgendaView } from "@/lib/agenda-views"
import { getCachedUser, getProfile } from "@/lib/supabase/cached-queries"

export const metadata: Metadata = {
  title: "Agendas | Beespo",
  description: "Manage your meetings and agendas",
}

export const dynamic = "force-dynamic"

export default async function AgendasPage() {
  const user = await getCachedUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(user.id)

  if (!profile || !profile.workspace_id) {
    redirect("/onboarding")
  }

  const supabase = await createClient()

  const isLeader = profile.role === "leader" || profile.role === "admin"

  // Fetch all required data in parallel
  const [
    workspaceResponse,
    meetingsResponse,
    inboundShareResponse,
    outboundShareResponse,
    templatesResponse,
    agendaViewsResponse
  ] = await Promise.all([
    (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
      .select("slug")
      .eq("id", profile.workspace_id)
      .single(),
    supabase
      .from("meetings")
      .select(
        `id, title, description, scheduled_date, status, is_publicly_shared, created_by, template_id, created_at, updated_at,
        templates (id, name)`
      )
      .eq("workspace_id", profile.workspace_id)
      .order("scheduled_date", { ascending: false })
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("meeting_shares")
      .select(
        `id, permission, meeting_id,
          meetings!meeting_id (
            id, workspace_id, title, description, scheduled_date, status, is_publicly_shared,
            created_by, notes, created_at, updated_at,
            templates (id, name),
            workspaces (name, slug)
          ),
          shared_by_profile:shared_by (full_name)`
      )
      .eq("recipient_user_id", user.id)
      .eq("status", "active"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("meeting_shares")
      .select("meeting_id")
      .eq("shared_by", user.id)
      .eq("status", "active"),
    (supabase.from("templates") as ReturnType<typeof supabase.from>)
      .select("id, name")
      .order("name"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("agenda_views") as any)
      .select("id, name, view_type, config, is_system, created_at")
      .eq("workspace_id", profile.workspace_id)
      .eq("view_type", "agendas")
      .order("created_at", { ascending: true })
  ])

  const { data: workspace } = workspaceResponse
  const { data: meetings, error: meetingsError } = meetingsResponse
  const { data: inboundShareData } = inboundShareResponse
  const { data: outboundShareData } = outboundShareResponse
  const { data: templates } = templatesResponse
  const { data: agendaViewsData } = agendaViewsResponse

  const workspaceSlug: string | null = workspace?.slug || null

  if (meetingsError) {
    console.error("Meetings query error:", meetingsError)
    return (
      <div className="p-8">Error loading agendas. Please try again.</div>
    )
  }

  // Build annotated shared-with-me meeting list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedMeetings = (inboundShareData || []).flatMap((share: { meetings: any, permission: any, shared_by_profile: any }) => {
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

  // Build Set of outward-shared meeting IDs
  const sharedOutwardIds: string[] = (outboundShareData || []).map(
    (row: { meeting_id: string }) => row.meeting_id
  )

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

  const initialViews: AgendaView[] = (agendaViewsData as AgendaView[]) ?? []

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
