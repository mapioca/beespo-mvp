"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, List, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarTab {
    slug: string
    label: string
    icon: LucideIcon
}

const CALENDAR_TABS: CalendarTab[] = [
    { slug: "view", label: "Calendar", icon: Calendar },
    { slug: "events", label: "Events", icon: List },
]

export function CalendarTabs() {
    const pathname = usePathname()

    // Determine active tab from pathname
    const getActiveTab = () => {
        const segments = pathname.split("/")
        // /calendar/view -> view
        // /calendar/events -> events
        const tabSlug = segments[2]
        return CALENDAR_TABS.find((tab) => tab.slug === tabSlug)?.slug || "view"
    }

    const activeTab = getActiveTab()

    return (
        <div className="border-b">
            <nav
                className="flex overflow-x-auto scrollbar-hide -mb-px"
                aria-label="Calendar Hub Tabs"
            >
                {CALENDAR_TABS.map((tab) => {
                    const Icon = tab.icon
                    const isActive = tab.slug === activeTab

                    return (
                        <Link
                            key={tab.slug}
                            href={`/calendar/${tab.slug}`}
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
