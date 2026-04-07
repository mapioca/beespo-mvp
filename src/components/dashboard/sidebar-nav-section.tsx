"use client"

import { cn } from "@/lib/utils"
import { NavSection, isNavItemParent } from "./sidebar-types"
import { SidebarNavItem } from "./sidebar-nav-item"
import { SidebarNavCollapsible } from "./sidebar-nav-collapsible"

interface SidebarNavSectionProps {
  section: NavSection
  pathname: string
  isCollapsed: boolean
  isGroupExpanded: (groupId: string, defaultOpen?: boolean) => boolean
  toggleGroup: (groupId: string) => void
  isFirst?: boolean
}

export function SidebarNavSection({
  section,
  pathname,
  isCollapsed,
  isGroupExpanded,
  toggleGroup,
  isFirst = false,
}: SidebarNavSectionProps) {
  return (
    <div className={cn(!isFirst && "mt-2.5")}>
      {/* Section Header - Hidden when collapsed */}
      {!isCollapsed && section.title && section.items.length > 0 && (
        <h3 className="text-nav-muted mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
          {section.title}
        </h3>
      )}

      {/* Section Items */}
      <div className="px-2">
        {section.items.map((item) => {
          if (isNavItemParent(item)) {
            const groupId = `${section.id}-${item.label.toLowerCase().replace(/\s+/g, "-")}`
            return (
              <div key={groupId} className="mt-3">
                <SidebarNavCollapsible
                  item={item}
                  isExpanded={isGroupExpanded(groupId, item.defaultOpen)}
                  onToggle={() => toggleGroup(groupId)}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
              </div>
            )
          }

          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          return (
            <div key={item.href} className="mt-0.5">
              <SidebarNavItem
                item={item}
                isCollapsed={isCollapsed}
                isActive={isActive}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
