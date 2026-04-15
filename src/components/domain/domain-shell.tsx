"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { cn } from "@/lib/utils"

export interface DomainNavItem {
  href: string
  label: string
  icon: LucideIcon
  disabled?: boolean
  matchMode?: "exact" | "prefix"
  children?: DomainNavItem[]
}

interface DomainShellProps {
  title: string
  navLabel: string
  items: DomainNavItem[]
  children: React.ReactNode
  singleExpandedGroup?: boolean
}

function isItemActive(pathname: string, item: DomainNavItem) {
  if (item.matchMode === "exact") {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function DomainShell({
  title,
  navLabel,
  items,
  children,
  singleExpandedGroup = false,
}: DomainShellProps) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const activeGroups = useMemo(() => {
    const next: Record<string, boolean> = {}
    for (const item of items) {
      if (!item.children?.length) continue
      next[item.href] = item.children.some((child) => isItemActive(pathname, child))
    }
    return next
  }, [items, pathname])

  useEffect(() => {
    setExpandedGroups((prev) => {
      if (singleExpandedGroup) {
        const activeHref = Object.entries(activeGroups).find(([, isActive]) => isActive)?.[0]
        if (!activeHref) return prev
        return Object.keys(activeGroups).reduce<Record<string, boolean>>((acc, href) => {
          acc[href] = href === activeHref
          return acc
        }, {})
      }

      const next = { ...prev }
      for (const [href, isActive] of Object.entries(activeGroups)) {
        if (isActive && !next[href]) {
          next[href] = true
        }
      }
      return next
    })
  }, [activeGroups, singleExpandedGroup])

  const toggleGroup = (href: string) => {
    setExpandedGroups((prev) => ({
      ...(singleExpandedGroup
        ? Object.keys(activeGroups).reduce<Record<string, boolean>>((acc, key) => {
            acc[key] = false
            return acc
          }, {})
        : prev),
      [href]: singleExpandedGroup
        ? !(prev[href] ?? activeGroups[href] ?? false)
        : !(prev[href] ?? activeGroups[href] ?? false),
    }))
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row gap-1.5 md:gap-1 xl:gap-1.5 2xl:gap-1.5">
      <aside className="md:w-64 md:shrink-0 h-full flex flex-col">
        <div className="flex-1 flex flex-col bg-card/60 backdrop-blur-md border border-app-island rounded-[16px] shadow-[var(--shadow-app-island)] overflow-hidden">
          <div className="hidden px-5 pb-3 pt-5 md:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              {title}
            </p>
          </div>
          <nav
            aria-label={navLabel}
            className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide md:flex-col md:gap-1 md:px-3 md:py-0"
          >
            {items.map((item) => {
              const Icon = item.icon
              const hasChildren = Boolean(item.children?.length)
              const hasActiveChild = hasChildren
                ? item.children!.some((child) => isItemActive(pathname, child))
                : false
              const itemIsDirectlyActive = isItemActive(pathname, item) && !hasActiveChild
              const isExpanded = hasChildren
                ? (expandedGroups[item.href] ?? hasActiveChild)
                : false

              const commonClassName = cn(
                "group inline-flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                itemIsDirectlyActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-nav-secondary-hover/10 dark:hover:bg-nav-secondary-hover/5 hover:text-foreground",
                item.disabled && "pointer-events-none opacity-50"
              )

              const content = (
                <>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </>
              )

              return (
                <div key={item.href} className="flex min-w-fit flex-col md:min-w-0">
                  <div className="flex items-center gap-1">
                    {item.disabled ? (
                      <span aria-disabled="true" className={cn(commonClassName, "flex-1")}>
                        {content}
                      </span>
                    ) : (
                      <Link href={item.href} className={cn(commonClassName, "flex-1")}>
                        {content}
                      </Link>
                    )}
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.href)}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                        />
                      </button>
                    )}
                  </div>
                  {hasChildren && isExpanded && (
                    <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-border/60 pl-2">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon
                        const childIsActive = isItemActive(pathname, child)
                        const childClassName = cn(
                          "inline-flex min-w-fit items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          childIsActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-nav-secondary-hover/10 dark:hover:bg-nav-secondary-hover/5 hover:text-foreground",
                          child.disabled && "pointer-events-none opacity-50"
                        )

                        const childContent = (
                          <>
                            <ChildIcon className="h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">{child.label}</span>
                          </>
                        )

                        return child.disabled ? (
                          <span key={child.href} aria-disabled="true" className={childClassName}>
                            {childContent}
                          </span>
                        ) : (
                          <Link key={child.href} href={child.href} className={childClassName}>
                            {childContent}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto bg-app-main-card border border-app-island-border rounded-[16px] shadow-[var(--shadow-app-island)]">
        {children}
      </div>
    </div>
  )
}
