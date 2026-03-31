import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AnnouncementsClient } from "@/components/announcements/announcements-client"
import { Metadata } from "next"
import { AnnouncementView } from "@/lib/table-views"

export const metadata: Metadata = {
  title: "Announcements | Beespo",
  description: "Manage time-based announcements for your organization",
}

export const dynamic = "force-dynamic"

export default async function AnnouncementsPage() {
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
    .select("workspace_id, role")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.workspace_id) {
    redirect("/onboarding")
  }

  // Fetch all announcements for this workspace (no pagination — client handles filtering/scroll)
  const {
    data: announcements,
    error,
  } = await supabase
    .from("announcements" as string)
    .select(
      "id, title, content, priority, status, deadline, display_start, display_until, created_at, updated_at, workspace_id, workspace_announcement_id, created_by, creator:profiles!created_by(full_name)"
    )
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Announcements query error:", error)
    return (
      <div className="p-8">Error loading announcements. Please try again.</div>
    )
  }

  // Compute counts for filter badges
  const statusCounts: Record<string, number> = {
    draft: 0,
    active: 0,
    stopped: 0,
  }
  const priorityCounts: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
  }

  announcements?.forEach(
    (a: { status: string; priority: string | null }) => {
      if (a.status in statusCounts) statusCounts[a.status]++
      if (a.priority && a.priority in priorityCounts)
        priorityCounts[a.priority]++
    }
  )

  // Fetch workspace-scoped announcement views
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: announcementViewsData } = await (supabase.from("agenda_views") as any)
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .eq("view_type", "announcements")
    .order("created_at", { ascending: true })

  const initialViews: AnnouncementView[] = announcementViewsData ?? []

  return (
    <AnnouncementsClient
      announcements={announcements || []}
      totalCount={announcements?.length || 0}
      statusCounts={statusCounts}
      priorityCounts={priorityCounts}
      currentFilters={{ search: "", status: [] }}
      initialViews={initialViews}
    />
  )
}
