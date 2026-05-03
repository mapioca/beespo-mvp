import { ArrowUpRight, Briefcase, ClipboardList, Landmark, LayoutGrid, Megaphone, MessageSquare, NotebookPen, PanelsTopLeft, UserRoundCheck } from "lucide-react"

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
            href: "/meetings/sacrament",
            label: "Sacrament Meeting",
            icon: Landmark,
            matchMode: "prefix" as const,
            showOverviewLink: false,
            children: [
              {
                href: "/meetings/sacrament/planner",
                label: "Program Planner",
                icon: Landmark,
                matchMode: "prefix" as const,
              },
              {
                href: "/meetings/sacrament/speakers",
                label: "Speaker Planner",
                icon: UserRoundCheck,
                matchMode: "prefix" as const,
              },
              {
                href: "/meetings/sacrament/archive",
                label: "Archive",
                icon: Landmark,
                matchMode: "prefix" as const,
              },
              {
                href: "/meetings/sacrament/business",
                label: "Business",
                icon: Briefcase,
                matchMode: "prefix" as const,
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
          href: "/discussions",
          label: "Discussions",
          icon: MessageSquare,
          matchMode: "prefix" as const,
        },
        {
          href: "/library/agendas",
          label: "Use a Template",
          icon: ArrowUpRight,
          matchMode: "exact" as const,
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
          matchMode: "exact" as const,
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
      href: "/meetings/sacrament/announcements",
      label: "Announcements",
      icon: Megaphone,
      matchMode: "prefix",
    },
  ]
}
