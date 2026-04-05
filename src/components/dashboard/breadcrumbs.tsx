"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChevronRight, Database, Table2, BookOpen, PanelLeft, Library } from "lucide-react"
import { cn } from "@/lib/utils"
import { getBreadcrumbTrail, BreadcrumbItem } from "@/lib/navigation/breadcrumb-config"
import type { ReactNode } from "react"
import { useMobileNav } from "@/components/dashboard/mobile-nav-context"

export type { BreadcrumbItem }

export interface BreadcrumbItemWithIcon extends BreadcrumbItem {
  icon?: ReactNode
}

function getIconForType(iconType?: "database" | "table" | "notebook" | "template"): ReactNode {
  switch (iconType) {
    case "database":
      return <Database className="h-3.5 w-3.5" />
    case "table":
      return <Table2 className="h-3.5 w-3.5" />
    case "notebook":
      return <BookOpen className="h-3.5 w-3.5" />
    case "template":
      return <Library className="h-3.5 w-3.5" />
    default:
      return null
  }
}

interface BreadcrumbsProps {
  items?: BreadcrumbItemWithIcon[]
  className?: string
  /** Renders inline after the last breadcrumb item (e.g. star + three-dot) */
  inlineAction?: ReactNode
  /** Renders at the far right of the bar (e.g. share + print buttons) */
  action?: ReactNode
}

export function Breadcrumbs({ items, className, inlineAction, action }: BreadcrumbsProps) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isElevated, setIsElevated] = useState(false)
  const trail: BreadcrumbItemWithIcon[] = items ?? getBreadcrumbTrail(pathname)
  const mobileNav = useMobileNav()

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    let scrollParent: HTMLElement | Window = window
    let current: HTMLElement | null = node.parentElement

    while (current) {
      const style = window.getComputedStyle(current)
      const canScrollY =
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflow === "auto" ||
        style.overflow === "scroll"

      if (canScrollY) {
        scrollParent = current
        break
      }
      current = current.parentElement
    }

    const readScrolled = () => {
      if (scrollParent === window) {
        setIsElevated(window.scrollY > 2)
        return
      }
      setIsElevated((scrollParent as HTMLElement).scrollTop > 2)
    }

    readScrolled()
    scrollParent.addEventListener("scroll", readScrolled, { passive: true })

    return () => {
      scrollParent.removeEventListener("scroll", readScrolled)
    }
  }, [])

  if (trail.length === 0) {
    return null
  }

  return (
    <div className="flex-shrink-0">
      <div
        ref={containerRef}
        className={cn(
          "sticky top-0 z-30 flex h-10 items-center gap-2 px-4 transition-[background-color,border-color,box-shadow] duration-200",
          isElevated
            ? "border-b border-border/55 bg-[hsl(var(--chrome)/0.86)] shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--chrome)/0.82)]"
            : "border-b border-transparent bg-transparent",
          className
        )}
      >
        {mobileNav && (
          <button
            type="button"
            onClick={() => mobileNav.setMobileOpen(true)}
            className="sm:hidden inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Open navigation"
          >
            <PanelLeft className="h-4 w-4 stroke-[1.6]" />
          </button>
        )}
        <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 overflow-hidden sm:block">
          <ol className="flex min-w-0 items-center gap-1 text-[12px] font-medium text-nav-muted">
            {trail.map((item, index) => {
              const isLast = index === trail.length - 1

              const icon = "icon" in item && item.icon ? item.icon : getIconForType(item.iconType)

              return (
                <li
                  key={index}
                  className={cn(
                    "min-w-0 items-center gap-1",
                    isLast ? "flex" : "hidden sm:flex"
                  )}
                >
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 text-nav-muted/70" />
                  )}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="flex min-w-0 items-center gap-1 transition-colors hover:text-nav-strong"
                    >
                      <span className="opacity-70">{icon}</span>
                      <span className="truncate max-w-[160px] sm:max-w-none">{item.label}</span>
                    </Link>
                  ) : (
                    <span className={cn("flex min-w-0 items-center gap-1", isLast && "font-semibold text-nav-strong")}>
                      <span className={cn(!isLast && "opacity-70")}>{icon}</span>
                      <span className="truncate max-w-[200px] sm:max-w-none">{item.label}</span>
                    </span>
                  )}
                </li>
              )
            })}
            {inlineAction && (
              <li className="flex items-center gap-0.5 ml-1 shrink-0">
                {inlineAction}
              </li>
            )}
          </ol>
        </nav>
        {action && (
          <div className="ml-auto flex items-center justify-end">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
