import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OverviewContentClient } from "@/components/meetings/hub/overview/overview-content"

export const metadata: Metadata = {
  title: "Command Center | Beespo",
  description: "Your central workspace for managing meetings and agendas",
}

export const dynamic = "force-dynamic"

export default async function MeetingsOverviewPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await (
    supabase.from("profiles") as ReturnType<typeof supabase.from>
  )
    .select("workspace_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    redirect("/onboarding")
  }

  // Fetch next upcoming meeting with agenda items
  const today = new Date().toISOString().split("T")[0]

  const { data: upcomingMeetingsRaw } = await supabase
    .from("meetings")
    .select(
      `
      id,
      title,
      scheduled_date,
      status,
      templates (id, name),
      agenda_items (id, title, item_type, participant_name)
    `
    )
    .eq("workspace_id", profile.workspace_id)
    .gte("scheduled_date", today)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .limit(10)

  // Type assertion for the meetings data
  interface MeetingRow {
    id: string
    title: string
    scheduled_date: string
    status: "scheduled" | "in_progress" | "completed" | "cancelled"
    templates: { id: string; name: string } | null
    agenda_items: { id: string; title: string; item_type: string; participant_name: string | null }[]
  }

  const upcomingMeetings = (upcomingMeetingsRaw || []) as MeetingRow[]
  const nextMeeting = upcomingMeetings[0] || null

  // Fetch pending business items
  const { data: pendingBusiness, count: businessPendingCount } = await (
    supabase.from("business_items") as ReturnType<typeof supabase.from>
  )
    .select("id, person_name, status", { count: "exact" })
    .eq("workspace_id", profile.workspace_id)
    .eq("status", "pending")
    .limit(5)

  // Fetch active discussions
  const { data: activeDiscussions, count: discussionsActiveCount } = await (
    supabase.from("discussions") as ReturnType<typeof supabase.from>
  )
    .select("id, title, status", { count: "exact" })
    .eq("workspace_id", profile.workspace_id)
    .in("status", ["new", "active", "decision_required"])
    .limit(5)

  // Fetch active announcements
  const { data: activeAnnouncements, count: announcementsActiveCount } = await (
    supabase.from("announcements") as ReturnType<typeof supabase.from>
  )
    .select("id, title, status, deadline", { count: "exact" })
    .eq("workspace_id", profile.workspace_id)
    .eq("status", "active")
    .limit(5)

  // Build pending items list for Action Inbox
  interface PendingItem {
    id: string
    title: string
    type: "business" | "discussion" | "announcement"
    status: string
    deadline?: string | null
  }

  const pendingItems: PendingItem[] = [
    ...(pendingBusiness || []).map((item: { id: string; person_name: string; status: string }) => ({
      id: item.id,
      title: item.person_name || "Unnamed Business Item",
      type: "business" as const,
      status: item.status,
    })),
    ...(activeDiscussions || []).map((item: { id: string; title: string; status: string }) => ({
      id: item.id,
      title: item.title,
      type: "discussion" as const,
      status: item.status,
    })),
    ...(activeAnnouncements || []).map(
      (item: { id: string; title: string; status: string; deadline: string | null }) => ({
        id: item.id,
        title: item.title,
        type: "announcement" as const,
        status: item.status,
        deadline: item.deadline,
      })
    ),
  ].slice(0, 8)

  return (
    <OverviewContentClient
      nextMeeting={nextMeeting}
      upcomingMeetings={upcomingMeetings.slice(1)} // Exclude the first one (it's the hero)
      pendingItems={pendingItems}
      counts={{
        businessPending: businessPendingCount || 0,
        discussionsActive: discussionsActiveCount || 0,
        announcementsActive: announcementsActiveCount || 0,
      }}
    />
  )
}
