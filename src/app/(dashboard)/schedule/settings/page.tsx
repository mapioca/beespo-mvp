import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"

import { CalendarSubscriptionsSettings } from "@/components/calendar/settings/calendar-subscriptions-settings"
import type { CalendarSubscription } from "@/types/database"

export const metadata: Metadata = {
  title: "Calendar Settings | Beespo",
  description: "Manage calendar settings and subscriptions",
}

export default async function ScheduleSettingsPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ])

  const { data: subscriptions } = await (supabase
    .from("calendar_subscriptions") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false })

  return (
    <CalendarSubscriptionsSettings
      initialSubscriptions={(subscriptions ?? []) as CalendarSubscription[]}
      workspaceId={profile.workspace_id}
      isAdmin={profile.role === "admin"}
    />
  )
}
