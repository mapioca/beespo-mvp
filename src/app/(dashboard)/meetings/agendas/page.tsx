import { createClient } from "@/lib/supabase/server"
import { MeetingsClient } from "@/components/meetings/meetings-client"
import { Metadata } from "next"
import { AgendaFilter } from "@/lib/agenda-views"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { cache } from "react"

export const metadata: Metadata = {
  title: "Agendas | Beespo",
  description: "Manage your meetings and agendas",
}

// Cache templates query (rarely changes)
const getTemplates = cache(async (supabase: Awaited<ReturnType<typeof createClient>>) => {
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name")
    .order("name")
  return templates || []
})

export default async function AgendasPage() {
  const [{ user, profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])

  const isLeader = profile.role === "leader" || profile.role === "admin"

  // Fetch workspace slug
  const { data: workspace } = await (
    supabase.from("workspaces") as ReturnType<typeof supabase.from>
  )
    .select("slug")
    .eq("id", profile.workspace_id)
    .single()
  const workspaceSlug: string | null = workspace?.slug || null

  const isAgendaMeeting = (meeting: { plan_type?: string | null }) =>
    meeting.plan_type === "agenda" || meeting.plan_type === null

  // Fetch agenda-backed records (legacy null plan_type records still appear here)
  // Limit to 30 for initial load (pagination handled client-side)
  const { data: meetings, error } = await supabase
    .from("meetings")
    .select(`
      *,
      templates (
        id,
        name
      )
    `)
    .eq("workspace_id", profile.workspace_id)
    .or("plan_type.eq.agenda,plan_type.is.null")
    .order("scheduled_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30)

  // Build templates map from nested data
  const templatesMap = new Map<string, { id: string; name: string }>()
  if (meetings) {
    meetings.forEach((m: { templates?: { id: string; name: string } | null }) => {
      if (m.templates) {
        templatesMap.set(m.templates.id, m.templates)
      }
    })
  }

  if (error) {
    console.error("Meetings query error:", error)
    return (
      <div className="p-8">Error loading agendas. Please try again.</div>
    )
  }

  // Parallelize share-related queries
  const [inboundShareData, outboundShareData] = await Promise.all([
    supabase
      .from("meeting_shares")
      .select(`
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
      `)
      .eq("recipient_user_id", user.id)
      .eq("status", "active")
      .then((res: { data: unknown }) => res.data),
    supabase
      .from("meeting_shares")
      .select("meeting_id")
      .eq("shared_by", user.id)
      .eq("status", "active")
      .then((res: { data: unknown }) => res.data),
  ])

  // Build annotated shared-with-me meeting list
  const sharedMeetings = (inboundShareData || []).flatMap((share: { meetings: { templates?: { id: string; name: string } | null; workspaces?: { name?: string } | null }; permission: string; shared_by_profile?: { full_name?: string } }) => {
    const m = share.meetings
    if (!m || !isAgendaMeeting(m)) return []
    return [
      {
        ...m,
        templates: m.templates || null,
        _shareType: "shared_with_me" as const,
        _sharePermission: share.permission,
        _sharedByName: (share.shared_by_profile as Record<string, unknown>)?.full_name ?? undefined,
        _sharedFromWorkspace: (m.workspaces as Record<string, unknown>)?.name ?? undefined,
      },
    ]
  })

  // Build Set of outward-shared meeting IDs (serialised as array for client)
  const sharedOutwardIds: string[] = (outboundShareData || []).map(
    (row: { meeting_id: string }) => row.meeting_id
  )

  // Fetch all templates for filter dropdown (cached)
  const templates = await getTemplates(supabase)

  // Compute counts for filter badges
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
      templateCounts[m.template_id] =
        (templateCounts[m.template_id] || 0) + 1
    } else {
      templateCounts["no-template"]++
    }
  })

  // Fetch workspace-scoped saved agenda filters (RLS enforces workspace isolation)
  const { data: agendaFiltersData } = await supabase
    .from("agenda_views")
    .select("id, workspace_id, created_by, name, view_type, filters, created_at, updated_at")
    .eq("workspace_id", profile.workspace_id)
    .eq("view_type", "agendas")
    .order("created_at", { ascending: true })

  const initialFilters: AgendaFilter[] = agendaFiltersData ?? []

  return (
    <MeetingsClient
      meetings={meetings || []}
      templates={templates}
      workspaceSlug={workspaceSlug}
      isLeader={isLeader}
      statusCounts={statusCounts}
      templateCounts={templateCounts}
      sharedMeetings={sharedMeetings}
      sharedOutwardIds={sharedOutwardIds}
      initialFilters={initialFilters}
      workspace="agendas"
    />
  )
}
