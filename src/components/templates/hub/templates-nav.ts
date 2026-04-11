import { ClipboardList, LayoutGrid, NotebookPen, PanelsTopLeft } from "lucide-react"

import type { DomainNavItem } from "@/components/domain/domain-shell"

export const templatesNavItems: DomainNavItem[] = [
  {
    href: "/templates",
    label: "All Templates",
    icon: LayoutGrid,
    matchMode: "exact",
  },
  {
    href: "/templates/programs",
    label: "Programs",
    icon: PanelsTopLeft,
    matchMode: "prefix",
  },
  {
    href: "/templates/agendas",
    label: "Agendas",
    icon: NotebookPen,
    matchMode: "prefix",
  },
  {
    href: "/templates/forms",
    label: "Forms",
    icon: ClipboardList,
    matchMode: "prefix",
  },
]
