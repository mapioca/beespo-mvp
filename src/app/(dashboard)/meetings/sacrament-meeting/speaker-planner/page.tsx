import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"
import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Speaker Planner | Beespo",
  description: "Bishopric-only sacrament meeting speaker planner",
}

export default async function SpeakerPlannerPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])
  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)

  if (!isBishopricOrganization(organizationType)) {
    notFound()
  }

  return (
    <div className="min-h-full">
      <Breadcrumbs />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Speaker Planner</h1>
          <p className="text-sm text-muted-foreground">
            Plan sacrament meeting speakers, topics, and upcoming assignments.
          </p>
        </section>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Speaker Planner</CardTitle>
            <CardDescription>
              Speaker planning tools will live here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This section is available only to bishopric workspaces.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
