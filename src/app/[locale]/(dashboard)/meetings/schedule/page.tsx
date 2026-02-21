import { createClient } from "@/lib/supabase/server"
import { MeetingsClient } from "@/components/meetings/meetings-client"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Metadata.schedule" })

  return {
    title: t("title"),
    description: t("description"),
  }
}

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic"

const ITEMS_PER_PAGE = 10

interface SchedulePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const supabase = await createClient()
  const t = await getTranslations("Dashboard.Meetings.Schedule")

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams

  // Parse pagination
  const rawPage = params?.page
  const currentPage = Number(rawPage) || 1
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  // Parse filter params
  const searchQuery = typeof params?.search === "string" ? params.search : ""
  const statusParam = params?.status
  const statusFilters: string[] = statusParam
    ? Array.isArray(statusParam)
      ? statusParam
      : statusParam.split(",")
    : []
  const templateParam = params?.template
  const templateFilters: string[] = templateParam
    ? Array.isArray(templateParam)
      ? templateParam
      : templateParam.split(",")
    : []

  // Get current user profile to check role and get workspace
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await (
    supabase.from("profiles") as ReturnType<typeof supabase.from>
  )
    .select("role, workspace_id")
    .eq("id", user?.id || "")
    .single()

  const isLeader = profile?.role === "leader" || profile?.role === "admin"

  // Fetch workspace slug
  let workspaceSlug: string | null = null
  if (profile?.workspace_id) {
    const { data: workspace } = await (
      supabase.from("workspaces") as ReturnType<typeof supabase.from>
    )
      .select("slug")
      .eq("id", profile.workspace_id)
      .single()
    workspaceSlug = workspace?.slug || null
  }

  // SECURITY: Ensure user has a workspace before querying meetings
  if (!profile?.workspace_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {t("noWorkspace")}
        </p>
      </div>
    )
  }

  // Build the query with filters
  let query = supabase.from("meetings").select(
    `
            *,
            templates (
                id,
                name
            )
        `,
    { count: "exact" }
  )

  // SECURITY: Always filter by workspace_id (defense-in-depth with RLS)
  query = query.eq("workspace_id", profile.workspace_id)

  // Apply search filter (ilike for case-insensitive partial match)
  if (searchQuery) {
    query = query.or(
      `title.ilike.%${searchQuery}%,workspace_meeting_id.ilike.%${searchQuery}%`
    )
  }

  // Apply status filter
  if (statusFilters.length > 0) {
    query = query.in("status", statusFilters)
  }

  // Apply template filter
  if (templateFilters.length > 0) {
    const hasNoTemplate = templateFilters.includes("no-template")
    const templateIds = templateFilters.filter((id) => id !== "no-template")

    if (hasNoTemplate && templateIds.length > 0) {
      // Include meetings with no template OR specific templates
      query = query.or(
        `template_id.is.null,template_id.in.(${templateIds.join(",")})`
      )
    } else if (hasNoTemplate) {
      // Only meetings with no template
      query = query.is("template_id", null)
    } else if (templateIds.length > 0) {
      // Only specific templates
      query = query.in("template_id", templateIds)
    }
  }

  // Apply sorting and pagination
  const {
    data: meetings,
    count,
    error,
  } = await query
    .order("scheduled_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Error fetching meetings:", error)
    return <div>{t("errorLoading")}</div>
  }

  // Fetch all templates for filter dropdown (unfiltered count)
  const { data: templates } = await (
    supabase.from("templates") as ReturnType<typeof supabase.from>
  )
    .select("id, name")
    .order("name")

  // Fetch counts for filter badges (based on workspace, not current filters)
  // Status counts
  const { data: statusCountsData } = await supabase
    .from("meetings")
    .select("status")
    .then(({ data }) => {
      const counts: Record<string, number> = {
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      }
      data?.forEach((m: { status: string }) => {
        if (m.status in counts) counts[m.status]++
      })
      return { data: counts }
    })

  // Template counts
  const { data: templateCountsData } = await supabase
    .from("meetings")
    .select("template_id")
    .then(({ data }) => {
      const counts: Record<string, number> = { "no-template": 0 }
      data?.forEach((m: { template_id: string | null }) => {
        if (m.template_id) {
          counts[m.template_id] = (counts[m.template_id] || 0) + 1
        } else {
          counts["no-template"]++
        }
      })
      return { data: counts }
    })

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)
  const hasNextPage = to < (count || 0) - 1
  const hasPrevPage = currentPage > 1

  // Current filter state to pass to client
  const currentFilters = {
    search: searchQuery,
    status: statusFilters,
    templateIds: templateFilters,
  }

  return (
    <>
      <MeetingsClient
        key={`${currentPage}-${searchQuery}-${statusFilters.join()}-${templateFilters.join()}`}
        meetings={meetings || []}
        templates={templates || []}
        workspaceSlug={workspaceSlug}
        isLeader={isLeader}
        statusCounts={statusCountsData || {}}
        templateCounts={templateCountsData || {}}
        currentFilters={currentFilters}
      />
      {(count || 0) > 0 && (
        <div className="px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t("showingResults", {
                from: from + 1,
                to: (Math.min(to + 1, count || 0) || 0) as number,
                total: count || 0,
              })}
            </p>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
            />
          </div>
        </div>
      )}
    </>
  )
}
