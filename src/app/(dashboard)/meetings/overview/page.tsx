import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, ClipboardList, LayoutGrid, Megaphone, NotebookPen, PanelsTopLeft, Plus } from "lucide-react"
import { redirect } from "next/navigation"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Meetings Overview | Beespo",
  description: "Navigate the core Meetings workspace and its primary actions",
}

type OverviewCard = {
  title: string
  description: string
  href: string
  icon: typeof LayoutGrid
}

const canonicalCards: OverviewCard[] = [
  {
    title: "Agendas",
    description: "Manage discussion-first plans and collaboration artifacts.",
    href: "/meetings/agendas",
    icon: NotebookPen,
  },
  {
    title: "Programs",
    description: "Track audience-facing plans and conducting flows as they come online.",
    href: "/meetings/programs",
    icon: PanelsTopLeft,
  },
  {
    title: "Assignments",
    description: "Review responsibilities shared across agendas and programs.",
    href: "/meetings/assignments",
    icon: ClipboardList,
  },
  {
    title: "Announcements",
    description: "Manage announcements independently from agenda and program content.",
    href: "/meetings/announcements",
    icon: Megaphone,
  },
]

function OverviewLinkCard({ item }: { item: OverviewCard }) {
  const Icon = item.icon

  return (
    <Link href={item.href} className="group block">
      <Card className="h-full border-border/70 transition-colors hover:border-primary/40 hover:bg-accent/30">
        <CardHeader className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            Open
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function MeetingsOverviewPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-full">
      <Breadcrumbs />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-6">
          <Card className="border-border/70 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl">Meetings overview</CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  Use this hub to move between the core Meetings surfaces without exposing
                  transitional workflows in the main navigation experience.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/meetings/create">
                    <Plus className="h-4 w-4" />
                    Create
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/schedule/events?create=event">
                    Create event
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Core Meetings surfaces</h2>
            <p className="text-sm text-muted-foreground">
              These destinations define the new secondary navigation for Meetings.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {canonicalCards.map((item) => (
              <OverviewLinkCard key={item.href} item={item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
