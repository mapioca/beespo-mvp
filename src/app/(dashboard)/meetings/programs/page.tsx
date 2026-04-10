import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, PanelsTopLeft } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Programs | Beespo",
  description: "Programs workspace placeholder for Meetings v2",
}

export default function ProgramsPage() {
  return (
    <div className="min-h-full">
      <Breadcrumbs />
      <div className="mx-auto flex w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Card className="w-full border-border/70">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PanelsTopLeft className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Programs are being staged</CardTitle>
              <CardDescription className="text-sm leading-6">
                This route is live so the new Meetings navigation is complete, but the dedicated
                programs workspace will arrive in a later phase.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Program planning should not assume a linked meeting or event up front. That linkage
              can be added later when publishing, sharing, or another downstream workflow requires
              it.
            </p>
            <Button asChild variant="outline">
              <Link href="/meetings/overview">
                Back to overview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
