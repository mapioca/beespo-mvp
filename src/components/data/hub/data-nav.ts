import { BookOpen, ClipboardList, LayoutGrid, Table2 } from "lucide-react"

import type { DomainNavItem } from "@/components/domain/domain-shell"

export const dataNavItems: DomainNavItem[] = [
  {
    href: "/data",
    label: "Overview",
    icon: LayoutGrid,
    matchMode: "exact",
  },
  {
    href: "/forms",
    label: "Forms",
    icon: ClipboardList,
    matchMode: "prefix",
  },
  {
    href: "/tables",
    label: "Tables",
    icon: Table2,
    matchMode: "prefix",
  },
  {
    href: "/notebooks",
    label: "Notebooks",
    icon: BookOpen,
    matchMode: "prefix",
  },
]
