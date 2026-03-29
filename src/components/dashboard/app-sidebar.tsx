"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Calendar,
  CalendarDays,
  CheckSquare,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  HandHeart,
  ClipboardList,
  Table2,
  MessagesSquare,
  NotebookTabs,
  BookUser,
  Handshake,
  Megaphone,
  Library,
  Database,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SidebarUserProfile } from "@/components/dashboard/sidebar-user-profile"
import { Button } from "@/components/ui/button"
import { NavSection } from "./sidebar-types"
import { SidebarNavSection } from "./sidebar-nav-section"
import { SidebarFavoritesSection } from "./sidebar-favorites-section"
import { useSidebarState } from "@/hooks/use-sidebar-state"

const navSections: NavSection[] = [
  {
    id: "main",
    title: "", // No section header for clean look
    items: [
      { href: "/dashboard", icon: Home, label: "Home" },
      { href: "/calendar", icon: Calendar, label: "Calendar" },
      {
        icon: CalendarDays,
        label: "Meetings",
        children: [
          { href: "/meetings/agendas", icon: NotebookTabs, label: "Agendas" },
          { href: "/meetings/business", icon: Handshake, label: "Business" },
          { href: "/meetings/announcements", icon: Megaphone, label: "Announcements" },
          { href: "/meetings/discussions", icon: MessagesSquare, label: "Discussions" },
          { href: "/meetings/directory", icon: BookUser, label: "Directory" },
          { href: "/templates/library", icon: Library, label: "Library" },
        ]
      },
      { href: "/callings", icon: HandHeart, label: "Callings" },
      { href: "/tasks", icon: CheckSquare, label: "Tasks" },
      {
        icon: Database,
        label: "Data",
        children: [
          { href: "/forms", icon: ClipboardList, label: "Forms" },
          { href: "/tables", icon: Table2, label: "Tables" },
          { href: "/notebooks", icon: BookOpen, label: "Notebooks" },
        ],
      },
    ],
  },
]

// Default expanded groups (Agenda is open by default, Apps collapsed)
const defaultExpandedGroups: Record<string, boolean> = {
  "management-agenda": true,
}

interface AppSidebarProps {
  workspaceName: string
  userName: string
  userEmail: string
  userId: string
  userAvatarUrl?: string
  userRoleTitle?: string
}

export function AppSidebar({
  workspaceName,
  userName,
  userEmail,
  userId,
  userAvatarUrl,
  userRoleTitle,
}: AppSidebarProps) {
  const pathname = usePathname()

  const {
    isCollapsed,
    toggleCollapsed,
    isGroupExpanded,
    toggleGroup,
  } = useSidebarState(defaultExpandedGroups)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "shrink-0 flex flex-col h-full border-r border-border/50 bg-background/80 backdrop-blur",
          "transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header with Logo and Toggle */}
        <div className="border-b border-border/50">
          <div
            className={cn(
              "flex transition-all duration-300 ease-in-out",
              isCollapsed
                ? "flex-col items-center justify-center gap-4 py-4"
                : "flex-row items-center justify-between px-4 pt-2 pb-1"
            )}
          >
            <Link
              href="/dashboard"
              className="block select-none"
              aria-label="Beespo home"
            >
              {isCollapsed ? (
                <span className="flex items-center justify-center h-8 w-8 text-sm font-semibold text-foreground leading-none">
                  B
                </span>
              ) : (
                <span className="text-sm font-semibold text-foreground leading-none tracking-tight">
                  Beespo
                </span>
              )}
            </Link>

            {/* Toggle Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Workspace Name - Below Logo */}
          {!isCollapsed && (
            <div className="px-4 pb-3">
              <p className="text-[11px] font-medium text-muted-foreground/80 truncate">
                {workspaceName}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navSections.map((section, index) => (
            <SidebarNavSection
              key={section.id}
              section={section}
              pathname={pathname}
              isCollapsed={isCollapsed}
              isGroupExpanded={isGroupExpanded}
              toggleGroup={toggleGroup}
              isFirst={index === 0}
            />
          ))}
          {/* Favorites Section */}
          <SidebarFavoritesSection isCollapsed={isCollapsed} />
        </nav>

        {/* User Profile */}
        <SidebarUserProfile
          name={userName}
          email={userEmail}
          userId={userId}
          roleTitle={userRoleTitle}
          avatarUrl={userAvatarUrl}
          isCollapsed={isCollapsed}
        />
      </aside>
    </TooltipProvider>
  )
}
