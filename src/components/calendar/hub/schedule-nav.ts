import { CalendarDays, List, Settings2 } from "lucide-react"

import type { DomainNavItem } from "@/components/domain/domain-shell"

export const scheduleNavItems: DomainNavItem[] = [
  {
    href: "/calendar/view",
    label: "Calendar",
    icon: CalendarDays,
    matchMode: "prefix",
  },
  {
    href: "/calendar/events",
    label: "Events",
    icon: List,
    matchMode: "prefix",
  },
  {
    href: "/calendar/settings",
    label: "Settings",
    icon: Settings2,
    matchMode: "prefix",
  },
]
