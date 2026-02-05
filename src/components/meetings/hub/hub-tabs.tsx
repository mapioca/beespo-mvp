"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  label: string
  icon: LucideIcon
}

const HUB_TABS: HubTab[] = [
  { slug: "overview", label: "Overview", icon: LayoutDashboard },
  { slug: "schedule", label: "Schedule", icon: CalendarDays },
  { slug: "business", label: "Business", icon: Briefcase },
  { slug: "announcements", label: "Announcements", icon: Megaphone },
  { slug: "discussions", label: "Discussions", icon: MessageSquare },
  { slug: "speakers", label: "Speakers", icon: Mic },
  { slug: "participants", label: "Participants", icon: UsersRound },
  { slug: "templates", label: "Templates", icon: FileText },
]

export function HubTabs() {
  const pathname = usePathname()

  // Determine active tab from pathname
  const getActiveTab = () => {
    const segments = pathname.split("/")
    // /meetings/overview -> overview
    // /meetings/schedule -> schedule
    const tabSlug = segments[2]
    return HUB_TABS.find((tab) => tab.slug === tabSlug)?.slug || "overview"
  }

  const activeTab = getActiveTab()

  return (
    <div className="border-b">
      <nav
        className="flex overflow-x-auto scrollbar-hide -mb-px"
        aria-label="Meetings Hub Tabs"
      >
        {HUB_TABS.map((tab) => {
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
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
