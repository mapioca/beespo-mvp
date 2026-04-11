"use client"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Calendar,
  CalendarDays,
  CheckSquare,
  Pin,
  PinOff,
  HandHeart,
  Database,
  LayoutTemplate,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SidebarUserProfile } from "@/components/dashboard/sidebar-user-profile"
import { BeespoLogo } from "@/components/ui/beespo-logo"
import { Button } from "@/components/ui/button"
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
      { href: "/templates", icon: LayoutTemplate, label: "Templates" },
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
const HOVER_COLLAPSE_DELAY = 250

// Smooth deceleration curve — starts fast, ends gently (drawer feel)
const DRAWER_EASING = "cubic-bezier(0.32, 0.72, 0, 1)"

interface AppSidebarProps {
  workspaceName: string
  userName: string
  userEmail: string
  userId: string
  userAvatarUrl?: string
  userRoleTitle?: string
  className?: string
  forceExpanded?: boolean
  hidePinToggle?: boolean
}

export function AppSidebar({
  userName,
  userEmail,
  userId,
  userAvatarUrl,
  userRoleTitle,
  className,
  forceExpanded,
  hidePinToggle,
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

  const isExpanded = forceExpanded || isPinned || isHovering
  const isOverlay = !isPinned && isHovering && !forceExpanded


  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (isPinned || forceExpanded) return
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      setIsHovering(true)
    }, HOVER_EXPAND_DELAY)
  }, [isPinned, forceExpanded, clearHoverTimer])

  const handleMouseLeave = useCallback(() => {
    if (isPinned || forceExpanded) return
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      setIsHovering(false)
    }, HOVER_COLLAPSE_DELAY)
  }, [isPinned, forceExpanded, clearHoverTimer])

  return (
    <TooltipProvider delayDuration={0}>
      {/* Outer wrapper — reserves layout space */}
      <div
        className={cn(
          "shrink-0 h-full relative",
          forceExpanded ? "w-52" : (isPinned ? "w-52" : "w-[42px]"),
          className
        )}
        style={{ transition: `width 280ms ${DRAWER_EASING}` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Aside — the drawer. Animates width to clip/reveal content. */}
        <aside
          className={cn(
            "h-full overflow-hidden bg-app-shell",
            isOverlay && "fixed inset-y-0 left-0 z-[100] rounded-r-2xl border-r border-y border-app-island shadow-[var(--shadow-app-island)]",
          )}
          style={{
            width: isExpanded ? 208 : 42, // w-52 / w-[44px]
            transition: `width 280ms ${DRAWER_EASING}, box-shadow 280ms ${DRAWER_EASING}, border-color 280ms ${DRAWER_EASING}`,
          }}
        >
          {/* Inner content — always at full expanded width (w-52).
              The aside clips it; the drawer animation just reveals/hides. */}
          <div className="flex flex-col h-full w-52 shrink-0">

            {/* Header — logo + pin toggle */}
            <div className="flex items-center h-[30px] justify-between px-4 mt-2.5 mb-1">
              <Link
                href="/dashboard"
                className="flex items-center select-none text-foreground"
                aria-label="Beespo home"
              >
                <BeespoLogo className="h-5 w-5 shrink-0" />
              </Link>

              {!hidePinToggle && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePinned}
                      className={cn(
                        "h-7 w-7 shrink-0",
                        isPinned
                          ? "text-nav-strong hover:text-nav"
                          : "text-nav hover:text-nav-strong",
                      )}
                    >
                      {isPinned ? (
                        <Pin className="h-3.5 w-3.5 stroke-[1.8]" />
                      ) : (
                        <PinOff className="h-3.5 w-3.5 stroke-[1.8]" />
                      )}
                      <span className="sr-only">
                        {isPinned ? "Unpin sidebar" : "Pin sidebar"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {isPinned ? "Unpin sidebar" : "Pin sidebar"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Navigation — always rendered in expanded layout */}
            <nav className="flex-1 overflow-y-auto py-2.5">
              {navSections.map((section, index) => (
                <SidebarNavSection
                  key={section.id}
                  section={section}
                  pathname={pathname}
                  isCollapsed={false}
                  sidebarExpanded={isExpanded}
                  isGroupExpanded={isGroupExpanded}
                  toggleGroup={toggleGroup}
                  isFirst={index === 0}
                />
              ))}
              <SidebarSavedItemsSection
                title="Favorites"
                items={favorites}
                isCollapsed={false}
                sidebarExpanded={isExpanded}
                itemType="favorites"
              />
              <SidebarSavedItemsSection
                title="Recent"
                items={recents}
                isCollapsed={false}
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
              isCollapsed={false}
            />
          </div>
        </aside>
      </div>
    </TooltipProvider>
  )
}
