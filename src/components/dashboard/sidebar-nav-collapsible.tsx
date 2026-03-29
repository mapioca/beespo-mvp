"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
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

  const hasActiveChild = item.children.some(
    (child) =>
      pathname === child.href ||
      (child.href !== "/dashboard" && pathname.startsWith(child.href))
  )

  // Flyout hover state — active when sidebar group is collapsed OR sidebar is fully collapsed
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Flyout enabled when sidebar is icon-only (collapsed) OR sidebar is expanded but group is not open
  const flyoutEnabled = isCollapsed || !isExpanded

  const openFlyout = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setFlyoutOpen(true)
  }, [])

  const scheduleFlyoutClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setFlyoutOpen(false), 100)
  }, [])

  // Close flyout immediately when the group expands (user clicked to expand)
  useEffect(() => {
    if (isExpanded) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setFlyoutOpen(false)
    }
  }, [isExpanded])

  // Sidebar collapsed → icon-only mode with the same Popover flyout (fully clickable)
  if (isCollapsed) {
    return (
      <Popover open={flyoutOpen} onOpenChange={() => {}}>
        <PopoverAnchor asChild>
          <button
            type="button"
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleFlyoutClose}
            className={cn(
              "flex items-center justify-center rounded-lg px-2 py-2 text-sm transition-colors w-full",
              hasActiveChild
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </button>
        </PopoverAnchor>

        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-44 p-1"
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleFlyoutClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
            {item.label}
          </p>
          <div className="mt-0.5 space-y-0.5">
            {item.children.map((child) => {
              const ChildIcon = child.icon
              const isActive =
                pathname === child.href ||
                (child.href !== "/dashboard" && pathname.startsWith(child.href))
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setFlyoutOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-blue-50 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      {/* Popover wraps the trigger and flyout content.
          open is only true when flyout is enabled (group collapsed) AND mouse is over. */}
      <Popover open={flyoutEnabled && flyoutOpen} onOpenChange={() => {}}>
        <PopoverAnchor asChild>
          <CollapsibleTrigger
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full",
              hasActiveChild
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-expanded={isExpanded}
            aria-controls={groupId}
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleFlyoutClose}
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
        </PopoverAnchor>

        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-44 p-1"
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleFlyoutClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
            {item.label}
          </p>
          <div className="mt-0.5 space-y-0.5">
            {item.children.map((child) => {
              const ChildIcon = child.icon
              const isActive =
                pathname === child.href ||
                (child.href !== "/dashboard" && pathname.startsWith(child.href))
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setFlyoutOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-muted/80 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

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
