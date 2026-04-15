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
  sidebarExpanded?: boolean
}

export function SidebarNavCollapsible({
  item,
  isExpanded,
  onToggle,
  pathname,
  isCollapsed,
  sidebarExpanded = true,
}: SidebarNavCollapsibleProps) {
  const Icon = item.icon
  const groupId = `nav-group-${item.label.toLowerCase().replace(/\s+/g, "-")}`
  const parentIsDirectlyActive =
    pathname === item.href ||
    (item.matchMode === "prefix" &&
      pathname.startsWith(item.href) &&
      !item.children.some(
        (child) =>
          pathname === child.href ||
          (child.matchMode === "prefix" && pathname.startsWith(child.href))
      ))

  // Flyout hover state — shows children in a popover when the group is collapsed
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flyoutEnabled = !isExpanded

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

  useEffect(() => {
    if (isExpanded) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setFlyoutOpen(false)
    }
  }, [isExpanded])

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Popover open={flyoutEnabled && flyoutOpen} onOpenChange={() => {}}>
        <PopoverAnchor asChild>
          {/* Section-header style trigger — icons align with nav items */}
          <CollapsibleTrigger
            className={cn(
              "group flex h-[30px] w-full items-center gap-2 rounded-md px-2 transition-colors",
              parentIsDirectlyActive
                ? "bg-nav-selected text-nav-strong shadow-[inset_0_0_0_1px_hsl(var(--nav-active-border))]"
                : "hover:bg-nav-hover"
            )}
            aria-expanded={isExpanded}
            aria-controls={groupId}
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleFlyoutClose}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 stroke-[1.75]",
                parentIsDirectlyActive ? "text-nav-strong" : "text-nav-muted"
              )}
            />
            <span
              className={cn(
                "flex-1 text-left text-[11px] tracking-[0.02em] whitespace-nowrap",
                parentIsDirectlyActive
                  ? "font-semibold text-nav-strong"
                  : "font-semibold text-nav-muted"
              )}
            >
              {item.label}
            </span>
            <span
              className={cn(
                "rounded-full bg-control px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                parentIsDirectlyActive ? "text-nav-strong" : "text-nav-muted"
              )}
            >
              {item.children.length}
            </span>
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 stroke-[1.6] transition-transform duration-200",
                parentIsDirectlyActive ? "text-nav-strong/70" : "text-muted-foreground/50",
                "opacity-0 group-hover:opacity-100",
                isExpanded && "rotate-90 opacity-100"
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
                    "flex h-[30px] items-center gap-2 rounded-md px-2 text-[12.5px] transition-[background-color,color,box-shadow] duration-150 ease-out",
                    isActive
                      ? "bg-nav-selected font-semibold text-nav-strong shadow-[inset_0_0_0_1px_hsl(var(--nav-active-border))]"
                      : "text-nav hover:bg-nav-hover hover:text-nav-strong"
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0 stroke-[1.75]" />
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
        {/* Children at same indentation as top-level items — no nesting offset */}
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => {
            const isActive =
              pathname === child.href ||
              (child.href !== "/dashboard" && pathname.startsWith(child.href))
            return (
              <SidebarNavItem
                key={child.href}
                item={child}
                isCollapsed={isCollapsed}
                isActive={isActive}
                sidebarExpanded={sidebarExpanded}
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
