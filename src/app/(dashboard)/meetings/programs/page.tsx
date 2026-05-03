import { createClient } from "@/lib/supabase/server"
import { MeetingsClient } from "@/components/meetings/meetings-client"
import { Metadata } from "next"
import { AgendaFilter } from "@/lib/agenda-views"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { canEdit } from "@/lib/auth/role-permissions"

export const metadata: Metadata = {
  title: "Programs | Beespo",
  description: "Manage audience-facing plans and conducting-ready program workspaces",
}

export default async function ProgramsPage() {
  const [{ user, profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])

  const isLeader = canEdit(profile.role)

  const { data: workspace } = await (
    supabase.from("workspaces") as ReturnType<typeof supabase.from>
  )
    .select("slug")
    .eq("id", profile.workspace_id)
    .single()
  const workspaceSlug: string | null = workspace?.slug || null

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
    .eq("plan_type", "program")
    .order("scheduled_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Programs query error:", error)
    return <div className="p-8">Error loading programs. Please try again.</div>
  }

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
        created_by, notes, created_at, updated_at, plan_type, event_id, zoom_meeting_id, template_id,
        templates (id, name),
        workspaces (name, slug)
      ),
      shared_by_profile:shared_by (full_name)
    `
    )
    .eq("recipient_user_id", user.id)
    .eq("status", "active")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: outboundShareData } = await (supabase as any)
    .from("meeting_shares")
    .select("meeting_id")
    .eq("shared_by", user.id)
    .eq("status", "active")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedMeetings = (inboundShareData || []).flatMap((share: any) => {
    const m = share.meetings
    if (!m || m.plan_type !== "program") return []
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedOutwardIds: string[] = (outboundShareData || []).map((row: any) => row.meeting_id)

  const { data: templates } = await (
    supabase.from("templates") as ReturnType<typeof supabase.from>
  )
    .select("id, name")
    .order("name")

  const statusCounts: Record<string, number> = {
    draft: 0,
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
      templateCounts[m.template_id] = (templateCounts[m.template_id] || 0) + 1
    } else {
      templateCounts["no-template"]++
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: programFiltersData } = await (supabase.from("agenda_views") as any)
    .select("id, workspace_id, created_by, name, view_type, filters, created_at, updated_at")
    .eq("workspace_id", profile.workspace_id)
    .eq("view_type", "programs")
    .order("created_at", { ascending: true })

  const initialFilters: AgendaFilter[] = programFiltersData ?? []

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
      initialFilters={initialFilters}
      workspace="programs"
    />
  )
}
