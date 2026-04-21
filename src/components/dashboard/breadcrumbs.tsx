"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getBreadcrumbTrail, BreadcrumbItem } from "@/lib/navigation/breadcrumb-config"
import type { ReactNode } from "react"
import { useMobileNav } from "@/components/dashboard/mobile-nav-context"

export type { BreadcrumbItem }

export interface BreadcrumbItemWithIcon extends BreadcrumbItem {
  icon?: ReactNode
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
    <div className="sticky top-0 z-30 flex-shrink-0">
      <div
        ref={containerRef}
        className={cn(
          "flex h-14 items-center gap-2 px-4 transition-[background-color,border-color,box-shadow] duration-200",
          isElevated
            ? "border-b border-border/55 bg-card shadow-[0_1px_0_rgba(15,23,42,0.06)]"
            : "border-b border-transparent bg-card",
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
          <ol className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-nav-muted">
            {trail.map((item, index) => {
              const isLast = index === trail.length - 1

              return (
                <li
                  key={index}
                  className={cn(
                    "min-w-0 items-center gap-1.5",
                    isLast ? "flex" : "hidden sm:flex"
                  )}
                >
                  {index > 0 && (
                    <span className="text-nav-muted/50 select-none">/</span>
                  )}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="truncate max-w-[160px] sm:max-w-none transition-colors hover:text-nav-strong"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={cn("truncate max-w-[200px] sm:max-w-none", isLast && "font-semibold text-nav-strong")}>
                      {item.label}
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
