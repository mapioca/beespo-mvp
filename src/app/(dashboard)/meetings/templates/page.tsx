import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TemplatesLayout } from "@/components/templates/templates-layout"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Templates | Beespo",
  description: "Manage meeting templates",
}

export const revalidate = 0

export default async function TemplatesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile to check organization
  const { data: profile } = await (
    supabase.from("profiles") as ReturnType<typeof supabase.from>
  )
    .select("workspace_id, role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/setup")
  }

  // Get all templates with their items
  const { data: templates } = await (
    supabase.from("templates") as ReturnType<typeof supabase.from>
  )
    .select("*, items:template_items(*)")
    .order("is_shared", { ascending: false })
    .order("created_at", { ascending: false })

  return (
    <TemplatesLayout
      templates={templates || []}
      currentUserId={user.id}
      userRole={profile.role}
    />
  )
}
