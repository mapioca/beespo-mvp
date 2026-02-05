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
    <div className={cn(!isFirst && "mt-6")}>
      {/* Section Header - Hidden when collapsed */}
      {!isCollapsed && (
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">
          {section.title}
        </h3>
      )}

      {/* Section Items */}
      <div className="space-y-1 px-2">
        {section.items.map((item) => {
          if (isNavItemParent(item)) {
            const groupId = `${section.id}-${item.label.toLowerCase().replace(/\s+/g, "-")}`
            return (
              <SidebarNavCollapsible
                key={groupId}
                item={item}
                isExpanded={isGroupExpanded(groupId, item.defaultOpen)}
                onToggle={() => toggleGroup(groupId)}
                pathname={pathname}
                isCollapsed={isCollapsed}
              />
            )
          }

          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          return (
            <SidebarNavItem
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              isActive={isActive}
            />
          )
        })}
      </div>
    </div>
  )
}
