import { LucideIcon } from "lucide-react"

/**
 * A leaf navigation item that links to a specific route
 */
export interface NavItemLeaf {
  href: string
  icon: LucideIcon
  label: string
}

/**
 * A parent navigation item that contains child items (collapsible group)
 */
export interface NavItemParent {
  icon: LucideIcon
  label: string
  children: NavItemLeaf[]
  defaultOpen?: boolean
}

/**
 * Union type for all navigation items
 */
export type NavItem = NavItemLeaf | NavItemParent

/**
 * Type guard to check if a NavItem is a parent (has children)
 */
export function isNavItemParent(item: NavItem): item is NavItemParent {
  return "children" in item && Array.isArray(item.children)
}

/**
 * Type guard to check if a NavItem is a leaf (has href)
 */
export function isNavItemLeaf(item: NavItem): item is NavItemLeaf {
  return "href" in item
}

/**
 * A section in the navigation containing a title and items
 */
export interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

/**
 * Sidebar state persisted to localStorage
 */
export interface SidebarState {
  isCollapsed: boolean
  expandedGroups: Record<string, boolean>
}
