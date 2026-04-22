import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BusinessClient } from "@/components/business/business-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Business | Beespo",
  description: "Manage business items for your organization",
}

export const revalidate = 0

export default async function BusinessPage() {
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

  const ITEMS_PER_PAGE = 50

  const { data: businessItems, error } = await (
    supabase.from("business_items") as ReturnType<typeof supabase.from>
  )
    .select(
      "id, person_name, position_calling, category, status, action_date, notes, details, created_at, updated_at, workspace_id, workspace_business_id, created_by, creator:profiles!created_by(full_name)"
    )
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false })
    .limit(ITEMS_PER_PAGE)

  if (error) {
    console.error("Business items query error:", error)
  }

  return <BusinessClient items={businessItems || []} />
}
