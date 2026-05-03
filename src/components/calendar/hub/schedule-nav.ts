import { CalendarDays, List, Settings2 } from "lucide-react"

import type { DomainNavItem } from "@/components/domain/domain-shell"

export const scheduleNavItems: DomainNavItem[] = [
  {
    href: "/schedule/calendar",
    label: "Calendar",
    icon: CalendarDays,
    matchMode: "prefix",
  },
  {
    href: "/schedule/events",
    label: "Events",
    icon: List,
    matchMode: "prefix",
  },
  {
    href: "/schedule/settings",
    label: "Settings",
    icon: Settings2,
    matchMode: "prefix",
  },
]
