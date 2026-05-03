import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, CalendarDays, LayoutList, PanelsTopLeft } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Create | Meetings | Beespo",
  description: "Choose what to create in the Meetings workspace",
}

type CreateCard = {
  title: string
  description: string
  href: string
  icon: typeof CalendarDays
}

const createCards: CreateCard[] = [
  {
    title: "Agenda",
    description: "Create an event and attach a discussion-first agenda workspace to it.",
    href: "/events/new?plan=agenda",
    icon: LayoutList,
  },
  {
    title: "Program",
    description: "Create an event and attach an audience-facing program workspace to it.",
    href: "/events/new?plan=program",
    icon: PanelsTopLeft,
  },
  {
    title: "Event",
    description: "Create a standalone calendar event — activity, interview, or the start of a meeting.",
    href: "/events/new",
    icon: CalendarDays,
  },
]

export default function MeetingsCreatePage() {
  return (
    <div className="min-h-full">
      <Breadcrumbs
        items={[
          { label: "Meetings", href: "/meetings/overview" },
          { label: "Create" },
        ]}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Create something new</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with the artifact you actually need. Plans, meetings, and events can be linked
            later when a downstream workflow makes that necessary.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {createCards.map((item) => {
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href} className="group block">
                <Card className="h-full border-border/70 transition-colors hover:border-primary/40 hover:bg-accent/30">
                  <CardHeader className="space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </section>
      </div>
    </div>
  )
}
