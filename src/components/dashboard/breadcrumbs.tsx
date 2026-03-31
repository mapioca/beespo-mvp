"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Database, Table2, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { getBreadcrumbTrail, BreadcrumbItem } from "@/lib/navigation/breadcrumb-config"
import type { ReactNode } from "react"

export type { BreadcrumbItem }

export interface BreadcrumbItemWithIcon extends BreadcrumbItem {
  icon?: ReactNode
}

function getIconForType(iconType?: "database" | "table" | "notebook"): ReactNode {
  switch (iconType) {
    case "database":
      return <Database className="h-3.5 w-3.5" />
    case "table":
      return <Table2 className="h-3.5 w-3.5" />
    case "notebook":
      return <BookOpen className="h-3.5 w-3.5" />
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
  const trail: BreadcrumbItemWithIcon[] = items ?? getBreadcrumbTrail(pathname)

  if (trail.length === 0) {
    return null
  }

  return (
    <div className="flex-shrink-0">
      <div className={cn("flex h-12 items-center gap-3 border-b border-border/80 bg-card px-4", className)}>
        <nav aria-label="Breadcrumb" className="flex-1">
          <ol className="flex items-center gap-1 text-[12px] font-medium text-[#8a8f98]">
            {trail.map((item, index) => {
              const isLast = index === trail.length - 1

              const icon = "icon" in item && item.icon ? item.icon : getIconForType(item.iconType)

              return (
                <li key={index} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 text-[#b0b4bc]" />
                  )}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="flex items-center gap-1 transition-colors hover:text-[#23262b]"
                    >
                      <span className="opacity-70">{icon}</span>
                      {item.label}
                    </Link>
                  ) : (
                    <span className={cn("flex items-center gap-1", isLast && "font-semibold text-[#23262b]")}>
                      <span className={cn(!isLast && "opacity-70")}>{icon}</span>
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
    </div>
  )
}
