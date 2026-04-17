import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, ClipboardList, Megaphone, NotebookPen, PanelsTopLeft } from "lucide-react"
import { redirect } from "next/navigation"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuickCreateMeetingButton } from "@/components/meetings/quick-create-meeting-button"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Meetings | Beespo",
  description: "Plan and manage your ward's meetings",
}

type OverviewCard = {
  title: string
  description: string
  href: string
  icon: typeof NotebookPen
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
    description: "Track audience-facing plans and conducting flows.",
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
    description: "Manage announcements independently from meeting content.",
    href: "/meetings/announcements",
    icon: Megaphone,
  },
]

function OverviewLinkCard({ item }: { item: OverviewCard }) {
  const Icon = item.icon

  return (
    <Link href={item.href} className="group block">
      <Card className="flex h-full flex-col border-border/70 transition-colors hover:border-primary/40 hover:bg-accent/30">
        <CardHeader className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="mt-auto">
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
        <section className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
            <p className="text-sm text-muted-foreground">Plan and manage your ward&apos;s meetings.</p>
          </div>
          <QuickCreateMeetingButton />
        </section>

        <section>
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
