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
  Pin,
  PinOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarUserProfile } from "@/components/dashboard/sidebar-user-profile"
import { BeespoLogo } from "@/components/ui/beespo-logo"
import { NavSection } from "./sidebar-types"
import { SidebarNavSection } from "./sidebar-nav-section"
import { SidebarSavedItemsSection } from "./sidebar-saved-items-section"
import { useSidebarState } from "@/hooks/use-sidebar-state"
import { useNavigationStore } from "@/stores/navigation-store"

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

const defaultExpandedGroups: Record<string, boolean> = {
  "management-agenda": true,
}

const HOVER_EXPAND_DELAY = 80
const HOVER_COLLAPSE_DELAY = 450

// Smooth deceleration curve — starts fast, ends gently (drawer feel)
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

  const {
    isPinned,
    togglePinned,
    isGroupExpanded,
    toggleGroup,
  } = useSidebarState(defaultExpandedGroups)

  const [isHovering, setIsHovering] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const isExpanded = forceExpanded || isHovering// When not force-expanded (mobile/fixed shell), it behaves as an overlay drawer

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (forceExpanded) return
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      setIsHovering(true)
    }, HOVER_EXPAND_DELAY)
  }, [forceExpanded, clearHoverTimer])

  const handleMouseLeave = useCallback(() => {
    if (forceExpanded) return
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      setIsHovering(false)
    }, HOVER_COLLAPSE_DELAY)
  }, [forceExpanded, clearHoverTimer])

  return (
    <TooltipProvider delayDuration={0}>
      {/* Outer wrapper — reserves layout space ONLY when forceExpanded (e.g. mobile sheet) */}
      <div
        className={cn(
          "relative z-40 shrink-0 h-full transition-[width] duration-300 ease-out",
          forceExpanded ? "w-64" : (isPinned ? "w-14" : "w-0"),
          className
        )}
      >
        {/* Aside — the drawer. Animates width to reveal content. */}
        <aside
          ref={sidebarRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "fixed transition-all duration-300 ease-out z-[100] flex flex-col group overflow-hidden",
            // Collapsed state: just an edge-hover trigger
            !isExpanded && !isPinned && "top-0 left-0 h-screen w-2 bg-transparent pointer-events-auto",
            // Pinned state (not expanded): narrow island strip
            !isExpanded && isPinned && "top-1.5 bottom-1.5 left-0 w-14 rounded-r-[16px] bg-app-island border-y border-r border-app-island shadow-sm opacity-100",
            // Expanded state: a detached island card
            isExpanded && "top-1.5 bottom-1.5 left-0 w-[240px] rounded-r-[16px] bg-app-island border-y border-r border-app-island shadow-2xl opacity-100",
            // Dashboard layout interactions
            forceExpanded && "relative translate-x-0 w-64 border-r bg-background top-0 left-0 h-screen rounded-none border-none shadow-none",
            !forceExpanded && !isExpanded && "translate-x-0",
            !forceExpanded && isExpanded && "translate-x-0"
          )}
        >
          {/* Inner content — always at full expanded width (w-52).
              The aside clips it; the drawer animation just reveals/hides. */}
          <div className={cn(
            "flex flex-col h-full w-full shrink-0 transition-all duration-200",
            !isExpanded && !isPinned && "opacity-0 pointer-events-none"
          )}>

            {/* Header — logo only (pin removed) */}
            <div className="flex h-[30px] items-center justify-between px-4 mt-2.5 mb-1">
              <Link
                href="/dashboard"
                className="flex items-center select-none text-foreground"
                aria-label="Beespo home"
              >
                <BeespoLogo className="h-5 w-5 shrink-0" />
                <span className={cn(
                  "ml-2.5 font-bold tracking-tight transition-all duration-200",
                  !isExpanded && "opacity-0 invisible w-0"
                )}>
                  Beespo
                </span>
              </Link>
              
              <button
                onClick={togglePinned}
                className={cn(
                  "p-1 rounded-md transition-all hover:bg-accent text-muted-foreground/60 hover:text-foreground",
                  !isExpanded && "opacity-0 invisible"
                )}
                title={isPinned ? "Unpin navigation" : "Pin navigation"}
              >
                {isPinned ? (
                  <PinOff className="h-3.5 w-3.5 rotate-45" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Navigation — always rendered in expanded layout */}
            <nav className="flex-1 overflow-y-auto py-2.5">
              {navSections.map((section, index) => (
                <SidebarNavSection
                  key={section.id}
                  section={section}
                  pathname={pathname}
                  isCollapsed={!isExpanded}
                  sidebarExpanded={isExpanded}
                  isGroupExpanded={isGroupExpanded}
                  toggleGroup={toggleGroup}
                  isFirst={index === 0}
                />
              ))}
              <SidebarSavedItemsSection
                title="Favorites"
                items={favorites}
                isCollapsed={!isExpanded}
                sidebarExpanded={isExpanded}
                itemType="favorites"
              />
              <SidebarSavedItemsSection
                title="Recent"
                items={recents}
                isCollapsed={!isExpanded}
                sidebarExpanded={isExpanded}
                itemType="recents"
              />
            </nav>

            {/* User Profile */}
            <SidebarUserProfile
              name={userName}
              email={userEmail}
              userId={userId}
              roleTitle={userRoleTitle}
              avatarUrl={userAvatarUrl}
              isCollapsed={!isExpanded}
              isPinned={isPinned}
              onTogglePinned={togglePinned}
            />
          </div>
        </aside>
      </div>
    </TooltipProvider>
  )
}
