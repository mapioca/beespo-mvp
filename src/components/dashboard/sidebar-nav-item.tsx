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
        "flex h-[30px] items-center gap-2 rounded-md px-2 text-[12.5px] transition-[background-color,color,box-shadow] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "bg-nav-selected text-nav-strong shadow-[inset_0_0_0_1px_hsl(var(--nav-active-border))]"
          : "text-nav hover:bg-nav-hover hover:text-nav-strong",
        isCollapsed && "justify-center px-2",
        isNested && !isCollapsed && "pl-5"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
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
