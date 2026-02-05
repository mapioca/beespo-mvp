import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DiscussionsClient } from "@/components/discussions/discussions-client"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Discussions | Beespo",
  description: "Track ongoing topics and decisions",
}

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic"

const ITEMS_PER_PAGE = 10

interface DiscussionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DiscussionsPage({
  searchParams,
}: DiscussionsPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams

  // Parse pagination
  const rawPage = params?.page
  const currentPage = Number(rawPage) || 1
  const from = (currentPage - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  // Parse search param
  const searchQuery = typeof params?.search === "string" ? params.search : ""

  // Parse filter params
  const statusParam = params?.status
  const statusFilters: string[] = statusParam
    ? Array.isArray(statusParam)
      ? statusParam
      : statusParam.split(",")
    : []

  // Get user profile to check role
  const { data: profile } = await (
    supabase.from("profiles") as ReturnType<typeof supabase.from>
  )
    .select("workspace_id, role")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.workspace_id) {
    redirect("/setup")
  }

  // Build query with filters
  let query = supabase
    .from("discussions" as string)
    .select(
      "id, title, description, category, status, priority, due_date, created_at, updated_at, workspace_id, workspace_discussion_id, created_by",
      { count: "exact" }
    )
    .eq("workspace_id", profile.workspace_id)

  // Apply search filter
  if (searchQuery) {
    query = query.or(
      `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,workspace_discussion_id.ilike.%${searchQuery}%`
    )
  }

  // Apply status filter
  if (statusFilters.length > 0) {
    query = query.in("status", statusFilters)
  }

  // Apply sorting and pagination
  const {
    data: discussions,
    count,
    error,
  } = await query.order("created_at", { ascending: false }).range(from, to)

  if (error) {
    console.error("Discussions query error:", error)
    return (
      <div className="p-8">Error loading discussions. Please try again.</div>
    )
  }

  // Fetch counts for filter badges (unfiltered counts)
  const { data: allDiscussions } = await (
    supabase.from("discussions") as ReturnType<typeof supabase.from>
  )
    .select("status, priority, category")
    .eq("workspace_id", profile.workspace_id)

  const statusCounts: Record<string, number> = {
    new: 0,
    active: 0,
    decision_required: 0,
    monitoring: 0,
    resolved: 0,
    deferred: 0,
  }
  const priorityCounts: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
  }
  const categoryCounts: Record<string, number> = {
    general: 0,
    budget: 0,
    personnel: 0,
    programs: 0,
    facilities: 0,
    welfare: 0,
    youth: 0,
    activities: 0,
  }

  allDiscussions?.forEach(
    (d: { status: string; priority: string | null; category: string | null }) => {
      if (d.status in statusCounts) statusCounts[d.status]++
      if (d.priority && d.priority in priorityCounts) priorityCounts[d.priority]++
      if (d.category && d.category in categoryCounts) categoryCounts[d.category]++
    }
  )

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)
  const hasNextPage = to < (count || 0) - 1
  const hasPrevPage = currentPage > 1

  // Current filter state to pass to client
  const currentFilters = {
    search: searchQuery,
    status: statusFilters,
  }

  return (
    <>
      <DiscussionsClient
        key={`${currentPage}-${searchQuery}-${statusFilters.join()}`}
        discussions={discussions || []}
        totalCount={count || 0}
        statusCounts={statusCounts}
        priorityCounts={priorityCounts}
        categoryCounts={categoryCounts}
        currentFilters={currentFilters}
      />
      {(count || 0) > 0 && (
        <div className="px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {from + 1}-{Math.min(to + 1, count || 0)} of {count}{" "}
              discussions
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
