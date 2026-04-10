import { ClipboardList, LayoutGrid, Megaphone, NotebookPen, PanelsTopLeft } from "lucide-react"

import type { DomainNavItem } from "@/components/domain/domain-shell"

export const meetingsNavItems: DomainNavItem[] = [
  {
    href: "/meetings/overview",
    label: "Overview",
    icon: LayoutGrid,
    matchMode: "exact",
  },
  {
    href: "/meetings/agendas",
    label: "Agendas",
    icon: NotebookPen,
    matchMode: "prefix",
  },
  {
    href: "/meetings/programs",
    label: "Programs",
    icon: PanelsTopLeft,
    matchMode: "prefix",
  },
  {
    href: "/meetings/assignments",
    label: "Assignments",
    icon: ClipboardList,
    matchMode: "prefix",
  },
  {
    href: "/meetings/announcements",
    label: "Announcements",
    icon: Megaphone,
    matchMode: "prefix",
  },
]
