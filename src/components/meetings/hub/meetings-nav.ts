import { ArrowUpRight, Briefcase, ClipboardList, LayoutGrid, Megaphone, MessageSquare, NotebookPen, PanelsTopLeft } from "lucide-react"

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
    children: [
      {
        href: "/meetings/agendas/discussions",
        label: "Discussions",
        icon: MessageSquare,
        matchMode: "prefix",
      },
      {
        href: "/library/agendas",
        label: "Use a Template",
        icon: ArrowUpRight,
        matchMode: "exact",
      },
    ],
  },
  {
    href: "/meetings/programs",
    label: "Programs",
    icon: PanelsTopLeft,
    matchMode: "prefix",
    children: [
      {
        href: "/meetings/program/business",
        label: "Business",
        icon: Briefcase,
        matchMode: "prefix",
      },
      {
        href: "/library/programs",
        label: "Use a Template",
        icon: ArrowUpRight,
        matchMode: "exact",
      },
    ],
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
