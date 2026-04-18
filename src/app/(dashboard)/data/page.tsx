import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, BookOpen, ClipboardList, LayoutGrid, Table2 } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Data Overview | Beespo",
  description: "Navigate forms, tables, and notebooks from the Data workspace",
}

type DataCard = {
  title: string
  description: string
  href: string
  icon: typeof LayoutGrid
}

const dataCards: DataCard[] = [
  {
    title: "Forms",
    description: "Build and manage forms used for collection and intake workflows.",
    href: "/forms",
    icon: ClipboardList,
  },
  {
    title: "Tables",
    description: "Manage structured data with customizable table schemas and records.",
    href: "/tables",
    icon: Table2,
  },
  {
    title: "Notebooks",
    description: "Capture notes, drafts, and reference material tied to your workspace.",
    href: "/notebooks",
    icon: BookOpen,
  },
]

export default function DataOverviewPage() {
  return (
    <div className="min-h-full">
      <Breadcrumbs />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Data overview</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose the data surface you need. Forms, tables, and notebooks are grouped here for faster navigation.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dataCards.map((item) => {
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href} className="group block">
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
          })}
        </section>
      </div>
    </div>
  )
}
