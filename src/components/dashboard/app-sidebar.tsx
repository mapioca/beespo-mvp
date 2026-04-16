"use client"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Calendar,
  CalendarDays,
  CheckSquare,
  HandHeart,
  Database,
  LayoutTemplate,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarUserProfile } from "@/components/dashboard/sidebar-user-profile"
import { BeespoLogo } from "@/components/ui/beespo-logo"
import { NavSection } from "./sidebar-types"
import { SidebarNavSection } from "./sidebar-nav-section"
import { SidebarSavedItemsSection } from "./sidebar-saved-items-section"
import { useNavigationStore } from "@/stores/navigation-store"
import { useCommandPaletteStore } from "@/stores/command-palette-store"

const navSections: NavSection[] = [
  {
    id: "main",
    title: "",
    items: [
      { href: "/dashboard", icon: Home, label: "Home" },
      { href: "/schedule/calendar", icon: Calendar, label: "Schedule" },
      { href: "/meetings", icon: CalendarDays, label: "Meetings" },
      { href: "/library", icon: LayoutTemplate, label: "Templates" },
      { href: "/callings", icon: HandHeart, label: "Callings" },
      { href: "/tasks", icon: CheckSquare, label: "Tasks" },
      { href: "/data", icon: Database, label: "Data" },
    ],
  },
]

const HOVER_EXPAND_DELAY = 80
const HOVER_COLLAPSE_DELAY = 300
const RAIL_WIDTH = 52
const EXPANDED_WIDTH = 232

interface AppSidebarProps {
  userName: string
  userEmail: string
  userId: string
  userAvatarUrl?: string
  userRoleTitle?: string
  className?: string
  forceExpanded?: boolean
}

export function AppSidebar({
  userName,
  userEmail,
  userId,
  userAvatarUrl,
  userRoleTitle,
  className,
  forceExpanded,
}: AppSidebarProps) {
  const pathname = usePathname()
  const favorites = useNavigationStore((state) => state.favorites)
  const recents = useNavigationStore((state) => state.recents)
  const toggleCommandPalette = useCommandPaletteStore((state) => state.toggle)

  const [isHovering, setIsHovering] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isExpanded = forceExpanded || isHovering || isMenuOpen

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (forceExpanded) return
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => setIsHovering(true), HOVER_EXPAND_DELAY)
  }, [forceExpanded, clearHoverTimer])

  const handleMouseLeave = useCallback(() => {
    if (forceExpanded) return
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => setIsHovering(false), HOVER_COLLAPSE_DELAY)
  }, [forceExpanded, clearHoverTimer])

  return (
    <TooltipProvider delayDuration={0}>
      {/* Layout reservation — always RAIL_WIDTH so content doesn't shift */}
      <div
        className={cn("relative shrink-0 h-full", className)}
        style={{ width: forceExpanded ? EXPANDED_WIDTH : RAIL_WIDTH }}
      >
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "absolute top-0 bottom-0 left-0 z-[100] flex flex-col overflow-hidden",
            "bg-app-island border-r border-app-island-border",
            "transition-[width] duration-200 ease-out",
            forceExpanded && "relative"
          )}
          style={{
            width: isExpanded ? EXPANDED_WIDTH : RAIL_WIDTH,
          }}
        >
          <div className="flex flex-col h-full w-full" style={{ width: EXPANDED_WIDTH }}>
            {/* Header — logo */}
            <div className="flex h-[44px] items-center px-[14px] shrink-0">
              <Link
                href="/dashboard"
                className="flex items-center select-none text-foreground"
                aria-label="Beespo home"
              >
                <BeespoLogo className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "ml-2.5 text-[14px] font-semibold tracking-tight transition-opacity duration-150",
                    !isExpanded && "opacity-0"
                  )}
                >
                  Beespo
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
              {navSections.map((section, index) => (
                <SidebarNavSection
                  key={section.id}
                  section={section}
                  pathname={pathname}
                  isCollapsed={!isExpanded}
                  sidebarExpanded={isExpanded}
                  isGroupExpanded={() => false}
                  toggleGroup={() => {}}
                  isFirst={index === 0}
                />
              ))}
              {isExpanded && (
                <>
                  <SidebarSavedItemsSection
                    title="Favorites"
                    items={favorites}
                    isCollapsed={false}
                    sidebarExpanded
                    itemType="favorites"
                  />
                  <SidebarSavedItemsSection
                    title="Recent"
                    items={recents}
                    isCollapsed={false}
                    sidebarExpanded
                    itemType="recents"
                  />
                </>
              )}
            </nav>

            {/* Cmd+K trigger */}
            <div className="shrink-0 px-2 pb-1.5">
              <button
                type="button"
                onClick={toggleCommandPalette}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md h-[30px] px-2 text-[12.5px]",
                  "text-nav hover:bg-nav-hover hover:text-nav-strong transition-colors"
                )}
                aria-label="Open command palette"
              >
                <span className="flex items-center justify-center shrink-0 h-[26px] w-[26px] -m-1 rounded-[6px]">
                  <Search className="h-[18px] w-[18px] stroke-[1.75]" />
                </span>
                <span
                  className={cn(
                    "flex-1 text-left font-medium transition-opacity duration-150",
                    !isExpanded && "opacity-0"
                  )}
                >
                  Search
                </span>
                <kbd
                  className={cn(
                    "ml-auto inline-flex items-center gap-0.5 rounded border border-app-island-border bg-background/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-opacity duration-150",
                    !isExpanded && "opacity-0"
                  )}
                >
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* User Profile */}
            <SidebarUserProfile
              name={userName}
              email={userEmail}
              userId={userId}
              roleTitle={userRoleTitle}
              avatarUrl={userAvatarUrl}
              isCollapsed={!isExpanded}
              isPinned
              onTogglePinned={() => {}}
              onMenuOpenChange={setIsMenuOpen}
            />
          </div>
        </aside>
      </div>
    </TooltipProvider>
  )
}
