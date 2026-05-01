"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/stores/workspace-store"

export interface DomainNavItem {
  href: string
  label: string
  icon: LucideIcon
  disabled?: boolean
  matchMode?: "exact" | "prefix"
  showOverviewLink?: boolean
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

function WorkspaceHeader({ sectionTitle }: { sectionTitle: string }) {
  const workspaceName = useWorkspaceStore((s) => s.workspaceName)
  if (!workspaceName) return null

  const initial = workspaceName.charAt(0).toUpperCase()

  return (
    <div 
      className="flex items-center justify-between border-b"
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--topbar-bg)',
        borderBottom: 'var(--topbar-border)',
        paddingLeft: 'var(--topbar-padding-x)',
        paddingRight: 'var(--topbar-padding-x)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground select-none">
          {initial}
        </span>
        <div className="min-w-0">
          <p 
            className="font-semibold truncate leading-tight"
            style={{
              fontSize: 'var(--topbar-title-size)',
              fontWeight: 'var(--topbar-title-weight)',
              color: 'var(--topbar-title-color)',
            }}
          >
            {workspaceName}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">{sectionTitle}</p>
        </div>
      </div>
    </div>
  )
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
      next[item.href] = item.children.some((child) => isItemActive(pathname || "", child))
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
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="md:w-60 md:shrink-0 h-full flex flex-col border-b border-app-island-border bg-app-sidebar md:border-b-0 md:border-r">
        <div className="flex-1 flex flex-col overflow-hidden">
          <WorkspaceHeader sectionTitle={title} />
          <nav
            aria-label={navLabel}
            className="flex gap-1 overflow-x-auto px-2 py-2 scrollbar-hide md:flex-col md:gap-0.5 md:px-2 md:py-2"
          >
            {items.map((item) => {
              const Icon = item.icon
              const hasChildren = Boolean(item.children?.length)
              const hasActiveChild = hasChildren
                ? item.children!.some((child) => isItemActive(pathname || "", child))
                : false
              const itemIsDirectlyActive = isItemActive(pathname || "", item) && !hasActiveChild
              const isExpanded = hasChildren
                ? (expandedGroups[item.href] ?? hasActiveChild)
                : false

              const baseItemClass =
                "group relative inline-flex min-w-fit items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out w-full focus-visible:outline-none focus-visible:bg-[#f5f5f4] focus-visible:text-[#1c1917] focus-visible:ring-2 focus-visible:ring-[#b45309]/30 focus-visible:ring-offset-2"
              const baseChildClass =
                "group relative inline-flex min-w-fit items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ease-out w-full focus-visible:outline-none focus-visible:bg-[#f5f5f4] focus-visible:text-[#1c1917] focus-visible:ring-2 focus-visible:ring-[#b45309]/30 focus-visible:ring-offset-2"
              const activeClass =
                "bg-white text-[#1c1917] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-[#b45309]"
              const inactiveClass =
                "text-[#57534e] hover:bg-[#f5f5f4] hover:text-[#1c1917]"
              const disabledClass = "text-[#a8a29e] cursor-not-allowed pointer-events-none"
              const iconClass = "h-3.5 w-3.5 shrink-0 text-[#78716c] group-hover:text-[#1c1917]"
              const iconActiveClass = "h-3.5 w-3.5 shrink-0 text-[#1c1917]"
              const iconDisabledClass = "h-3.5 w-3.5 shrink-0 text-[#a8a29e]"

              if (hasChildren) {
                return (
                  <div key={item.href} className="flex min-w-fit flex-col md:min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.href)}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label}`}
                      className={cn(
                        baseItemClass,
                        hasActiveChild ? "text-[#1c1917]" : inactiveClass
                      )}
                    >
                      <Icon className={hasActiveChild ? iconActiveClass : iconClass} />
                      <span className="flex-1 whitespace-nowrap text-left">{item.label}</span>
                      <ChevronRight
                        className={cn("h-3 w-3 shrink-0 transition-transform", isExpanded && "rotate-90")}
                      />
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                        {item.showOverviewLink !== false ? (
                          <Link
                            href={item.href}
                            className={cn(baseChildClass, itemIsDirectlyActive ? activeClass : inactiveClass)}
                          >
                            <Icon className={itemIsDirectlyActive ? iconActiveClass : iconClass} />
                            <span className="whitespace-nowrap">All {item.label}</span>
                          </Link>
                        ) : null}
                        {item.children!.map((child) => {
                          const ChildIcon = child.icon
                          const childIsActive = isItemActive(pathname || "", child)

                          return child.disabled ? (
                            <span
                              key={child.href}
                              aria-disabled="true"
                              className={cn(baseChildClass, disabledClass)}
                            >
                              <ChildIcon className={iconDisabledClass} />
                              <span className="whitespace-nowrap">{child.label}</span>
                            </span>
                          ) : (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(baseChildClass, childIsActive ? activeClass : inactiveClass)}
                            >
                              <ChildIcon className={childIsActive ? iconActiveClass : iconClass} />
                              <span className="whitespace-nowrap">{child.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div key={item.href} className="flex min-w-fit flex-col md:min-w-0">
                  {item.disabled ? (
                    <span
                      aria-disabled="true"
                      className={cn(baseItemClass, disabledClass)}
                    >
                      <Icon className={iconDisabledClass} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(baseItemClass, itemIsDirectlyActive ? activeClass : inactiveClass)}
                    >
                      <Icon className={itemIsDirectlyActive ? iconActiveClass : iconClass} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto bg-app-main-card">
        {children}
      </div>
    </div>
  )
}
