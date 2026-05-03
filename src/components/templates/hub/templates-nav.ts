import { ClipboardList, LayoutGrid, NotebookPen, PanelsTopLeft } from "lucide-react"

import type { DomainNavItem } from "@/components/domain/domain-shell"

export const templatesNavItems: DomainNavItem[] = [
  {
    href: "/library",
    label: "All Templates",
    icon: LayoutGrid,
    matchMode: "exact",
  },
  {
    href: "/library/programs",
    label: "Programs",
    icon: PanelsTopLeft,
    matchMode: "prefix",
  },
  {
    href: "/library/agendas",
    label: "Agendas",
    icon: NotebookPen,
    matchMode: "prefix",
  },
  {
    href: "/library/forms",
    label: "Forms",
    icon: ClipboardList,
    matchMode: "prefix",
  },
]
