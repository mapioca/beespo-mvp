import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, CalendarSync, Download, Upload } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Schedule Settings | Beespo",
  description: "Schedule settings placeholder for subscriptions and import/export",
}

export default function ScheduleSettingsPage() {
  return (
    <div className="min-h-full">
      <Breadcrumbs />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-border/70 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl">Schedule settings</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              This phase adds the dedicated route and navigation slot for schedule settings.
              Subscription, import, and export controls will consolidate here in a later phase.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarSync className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Subscriptions</CardTitle>
              <CardDescription>Calendar subscriptions will move into this surface.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Import</CardTitle>
              <CardDescription>Event import settings will be grouped here once implemented.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Download className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Export</CardTitle>
              <CardDescription>Export controls will land here without changing existing pages.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div>
          <Button asChild variant="outline">
            <Link href="/schedule/calendar">
              Return to calendar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
