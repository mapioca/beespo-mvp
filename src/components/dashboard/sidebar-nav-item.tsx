"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NavItemLeaf } from "./sidebar-types"

interface SidebarNavItemProps {
  item: NavItemLeaf
  isCollapsed: boolean
  isActive: boolean
  isNested?: boolean
}

export function SidebarNavItem({
  item,
  isCollapsed,
  isActive,
  isNested = false,
}: SidebarNavItemProps) {
  const Icon = item.icon

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-[hsl(var(--accent-warm))] text-foreground"
          : "text-muted-foreground hover:bg-[hsl(var(--accent-warm)/0.6)] hover:text-foreground",
        isCollapsed && "justify-center px-2",
        isNested && !isCollapsed && "pl-6"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 stroke-[1.6]" />
      {!isCollapsed && <span className="font-medium">{item.label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return <div>{linkContent}</div>
}
