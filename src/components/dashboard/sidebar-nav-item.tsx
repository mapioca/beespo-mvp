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
  sidebarExpanded?: boolean
}

export function SidebarNavItem({
  item,
  isCollapsed,
  isActive,
  sidebarExpanded = true,
}: SidebarNavItemProps) {
  const Icon = item.icon

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "flex h-[30px] items-center gap-2 rounded-md px-2 text-[12.5px] whitespace-nowrap transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Full-row active state — only when sidebar is expanded
        sidebarExpanded && isActive
          ? "bg-nav-selected text-nav-strong shadow-[inset_0_0_0_1px_hsl(var(--nav-active-border))]"
          : !isActive && "text-nav hover:bg-nav-hover hover:text-nav-strong",
        // When collapsed + active, no bg on the row — the icon gets it instead
        !sidebarExpanded && isActive && "text-nav-strong",
        isCollapsed && "px-2",
      )}
    >
      {/* Icon wrapper — always 26x26 with -m-1 so it occupies 18px of layout space.
          Background only appears when sidebar is collapsed + active. */}
      <span
        className={cn(
          "flex items-center justify-center shrink-0 h-[26px] w-[26px] -m-1 rounded-[6px]",
          "transition-[background-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          !sidebarExpanded && isActive && "bg-nav-selected shadow-[inset_0_0_0_1px_hsl(var(--nav-active-border))]"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.75]" />
      </span>
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
