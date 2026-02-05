"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getBreadcrumbTrail, BreadcrumbItem } from "@/lib/navigation/breadcrumb-config"

interface BreadcrumbsProps {
  /**
   * Optional custom breadcrumb items to override auto-detection
   */
  items?: BreadcrumbItem[]
  /**
   * Optional class name for the container
   */
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname()
  const trail = items ?? getBreadcrumbTrail(pathname)

  // Don't render if there's only one item (current page) or no items
  if (trail.length <= 1) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-2", className)}>
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && "text-foreground font-medium")}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
