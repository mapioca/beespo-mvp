import { ArrowUpRight, Briefcase, ClipboardList, Landmark, LayoutGrid, Megaphone, MessageSquare, NotebookPen, PanelsTopLeft } from "lucide-react"

import type { DomainNavItem } from "@/components/domain/domain-shell"

export function getMeetingsNavItems(isBishopric: boolean): DomainNavItem[] {
  return [
    {
      href: "/meetings/overview",
      label: "Overview",
      icon: LayoutGrid,
      matchMode: "exact",
    },
    ...(isBishopric
      ? [
          {
            href: "/meetings/sacrament-meeting",
            label: "Sacrament Meeting",
            icon: Landmark,
            matchMode: "prefix" as const,
            showOverviewLink: false,
            children: [
              {
                href: "/meetings/sacrament-meeting/planner",
                label: "Planner",
                icon: Landmark,
                matchMode: "prefix",
              },
              {
                href: "/meetings/sacrament-meeting/audience",
                label: "Audience",
                icon: Landmark,
                matchMode: "prefix",
              },
              {
                href: "/meetings/sacrament-meeting/archive",
                label: "Archive",
                icon: Landmark,
                matchMode: "prefix",
              },
              {
                href: "/meetings/sacrament-meeting/business",
                label: "Business",
                icon: Briefcase,
                matchMode: "prefix",
              },
            ],
          },
        ]
      : []),
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
}
