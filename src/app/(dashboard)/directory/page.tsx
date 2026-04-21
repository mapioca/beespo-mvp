import type { Metadata } from "next"

import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { createClient } from "@/lib/supabase/server"

import { DirectoryClient, type DirectoryMember } from "./directory-client"

export const metadata: Metadata = {
  title: "Directory | Beespo",
  description: "Ward directory",
}

export default async function DirectoryPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])

  const [{ data: workspace }, { data, count, error }] = await Promise.all([
    (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
      .select("name, unit_name")
      .eq("id", profile.workspace_id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("directory" as any) as any)
      .select("id, name, created_at", { count: "exact" })
      .eq("workspace_id", profile.workspace_id)
      .order("name", { ascending: true }),
  ])

  if (error) {
    console.error("Directory query error:", error)
  }

  const members: DirectoryMember[] = ((data ?? []) as DirectoryMember[]).map((member) => ({
    id: member.id,
    name: member.name,
    created_at: member.created_at,
  }))

  return (
    <DirectoryClient
      members={members}
      totalCount={count ?? members.length}
      workspaceId={profile.workspace_id}
      wardName={workspace?.unit_name || workspace?.name || "Ward"}
      hasError={Boolean(error)}
    />
  )
}
