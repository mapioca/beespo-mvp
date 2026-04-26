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

  const { data, count, error } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("directory" as any) as any)
      .select("id, name, gender, created_at", { count: "exact" })
      .eq("workspace_id", profile.workspace_id)
      .order("name", { ascending: true })

  if (error) {
    console.error("Directory query error:", error)
  }

  const members: DirectoryMember[] = ((data ?? []) as DirectoryMember[]).map((member) => ({
    id: member.id,
    name: member.name,
    gender: member.gender,
    created_at: member.created_at,
  }))

  return (
    <DirectoryClient
      members={members}
      totalCount={count ?? members.length}
      workspaceId={profile.workspace_id}
      hasError={Boolean(error)}
    />
  )
}
