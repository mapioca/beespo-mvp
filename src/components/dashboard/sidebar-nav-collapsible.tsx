"use client"

import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NavItemParent } from "./sidebar-types"
import { SidebarNavItem } from "./sidebar-nav-item"

interface SidebarNavCollapsibleProps {
  item: NavItemParent
  isExpanded: boolean
  onToggle: () => void
  pathname: string
  isCollapsed: boolean
}

export function SidebarNavCollapsible({
  item,
  isExpanded,
  onToggle,
  pathname,
  isCollapsed,
}: SidebarNavCollapsibleProps) {
  const Icon = item.icon
  const groupId = `nav-group-${item.label.toLowerCase().replace(/\s+/g, "-")}`

  // Check if any child is active
  const hasActiveChild = item.children.some(
    (child) =>
      pathname === child.href ||
      (child.href !== "/dashboard" && pathname.startsWith(child.href))
  )

  // When sidebar is collapsed, show a tooltip with the parent name
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors w-full",
              hasActiveChild
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          <div className="space-y-1">
            <div className="font-semibold">{item.label}</div>
            {item.children.map((child) => (
              <div key={child.href} className="text-muted-foreground text-xs">
                {child.label}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
          hasActiveChild
            ? "bg-accent/50 text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        )}
        aria-expanded={isExpanded}
        aria-controls={groupId}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        id={groupId}
        className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
      >
        <div className="mt-1 space-y-1">
          {item.children.map((child) => {
            const isActive =
              pathname === child.href ||
              (child.href !== "/dashboard" && pathname.startsWith(child.href))

            return (
              <SidebarNavItem
                key={child.href}
                item={child}
                isCollapsed={false}
                isActive={isActive}
                isNested
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
