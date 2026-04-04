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
        "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-[background-color,color] duration-150 ease-out",
        isActive
          ? "bg-nav-selected text-nav-strong"
          : "text-nav hover:bg-nav-hover hover:text-nav-strong",
        isCollapsed && "justify-center px-2",
        isNested && !isCollapsed && "pl-7"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 stroke-[1.7]" />
      {!isCollapsed && <span className={cn(isActive ? "font-semibold" : "font-medium")}>{item.label}</span>}
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
