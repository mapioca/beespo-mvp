"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  Megaphone,
  MessageSquare,
  FileText,
  Mic,
  UsersRound,
  LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface HubTab {
  slug: string
  labelKey: string
  icon: LucideIcon
}

const HUB_TAB_DEFS: HubTab[] = [
  { slug: "overview", labelKey: "overview", icon: LayoutDashboard },
  { slug: "schedule", labelKey: "schedule", icon: CalendarDays },
  { slug: "business", labelKey: "business", icon: Briefcase },
  { slug: "announcements", labelKey: "announcements", icon: Megaphone },
  { slug: "discussions", labelKey: "discussions", icon: MessageSquare },
  { slug: "speakers", labelKey: "speakers", icon: Mic },
  { slug: "participants", labelKey: "participants", icon: UsersRound },
  { slug: "templates", labelKey: "templates", icon: FileText },
]

type TabKey =
  | "overview"
  | "schedule"
  | "business"
  | "announcements"
  | "discussions"
  | "speakers"
  | "participants"
  | "templates"

export function HubTabs() {
  const pathname = usePathname()
  const t = useTranslations("Dashboard.Meetings.hub.tabs")

  // Determine active tab from pathname
  const getActiveTab = () => {
    const segments = pathname.split("/")
    // /meetings/overview -> overview
    // /meetings/schedule -> schedule
    const tabSlug = segments[2]
    return HUB_TAB_DEFS.find((tab) => tab.slug === tabSlug)?.slug || "overview"
  }

  const activeTab = getActiveTab()

  return (
    <div className="border-b">
      <nav
        className="flex overflow-x-auto scrollbar-hide -mb-px"
        aria-label="Meetings Hub Tabs"
      >
        {HUB_TAB_DEFS.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.slug === activeTab

          return (
            <Link
              key={tab.slug}
              href={`/meetings/${tab.slug}`}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-w-[44px]",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t(tab.labelKey as TabKey)}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
