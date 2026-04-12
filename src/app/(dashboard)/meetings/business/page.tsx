import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BusinessClient } from "@/components/business/business-client"
import { Metadata } from "next"
import { BusinessView } from "@/lib/table-views"
import { getCachedUser, getProfile } from "@/lib/supabase/cached-queries"

export const metadata: Metadata = {
  title: "Business | Beespo",
  description: "Manage business items for your organization",
}

// Disable caching to ensure new business items appear immediately
export const revalidate = 0

export default async function BusinessPage() {
  const user = await getCachedUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getProfile(user.id)

  if (!profile || !profile.workspace_id) {
    redirect("/onboarding")
  }

  const supabase = await createClient()

  // Pagination settings
  const ITEMS_PER_PAGE = 50

  // Fetch business items and views in parallel
  const [businessResponse, viewsResponse] = await Promise.all([
    (supabase.from("business_items") as ReturnType<typeof supabase.from>)
      .select(
        "id, person_name, position_calling, category, status, action_date, notes, details, created_at, updated_at, workspace_id, workspace_business_id, created_by, creator:profiles!created_by(full_name)"
      )
      .eq("workspace_id", profile.workspace_id)
      .order("created_at", { ascending: false })
      .limit(ITEMS_PER_PAGE),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("agenda_views") as any)
      .select("id, name, view_type, config, is_system, created_at")
      .eq("workspace_id", profile.workspace_id)
      .eq("view_type", "business")
      .order("created_at", { ascending: true }),
  ])

  const { data: businessItems, error } = businessResponse
  const { data: businessViewsData } = viewsResponse

  if (error) {
    console.error("Business items query error:", error)
  }

  const initialViews: BusinessView[] = (businessViewsData as BusinessView[]) ?? []

  return <BusinessClient items={businessItems || []} initialViews={initialViews} />
}
