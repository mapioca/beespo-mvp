"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getBreadcrumbTrail, BreadcrumbItem } from "@/lib/navigation/breadcrumb-config"
import type { ReactNode } from "react"

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
  const trail: BreadcrumbItemWithIcon[] = items ?? getBreadcrumbTrail(pathname)

  if (trail.length <= 1) {
    return null
  }

  return (
    <div className={cn("flex-shrink-0 px-6 py-3 border-b flex items-center gap-3", className)}>
      <nav aria-label="Breadcrumb" className="flex-1">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          {trail.map((item, index) => {
            const isLast = index === trail.length - 1

            return (
              <li key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn("flex items-center gap-1", isLast && "text-foreground font-medium")}>
                    {item.icon}
                    {item.label}
                  </span>
                )}
              </li>
            )
          })}
          {inlineAction && (
            <li className="flex items-center gap-0.5 ml-1">
              {inlineAction}
            </li>
          )}
        </ol>
      </nav>
      {action}
    </div>
  )
}
