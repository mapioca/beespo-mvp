"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Home,
  Calendar,
  CalendarDays,
  CheckSquare,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  LifeBuoy,
  HandHeart,
  ClipboardList,
  Table2,
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
import { SupportModal } from "@/components/support/support-modal"
import { NavSection } from "./sidebar-types"
import { SidebarNavSection } from "./sidebar-nav-section"
import { SidebarAppsSection } from "./sidebar-apps-section"
import { useSidebarState } from "@/hooks/use-sidebar-state"

const navSections: NavSection[] = [
  {
    id: "main",
    title: "", // No section header for clean look
    items: [
      { href: "/dashboard", icon: Home, label: "Dashboard" },
      { href: "/calendar", icon: Calendar, label: "Calendar" },
      { href: "/meetings/overview", icon: CalendarDays, label: "Meetings" },
      { href: "/tasks", icon: CheckSquare, label: "Tasks" },
      { href: "/callings", icon: HandHeart, label: "Callings" },
      { href: "/forms", icon: ClipboardList, label: "Forms" },
      { href: "/tables", icon: Table2, label: "Tables" },
      { href: "/notebooks", icon: BookOpen, label: "Notebooks" },
    ],
  },
]

// Default expanded groups (Agenda is open by default, Apps collapsed)
const defaultExpandedGroups: Record<string, boolean> = {
  "management-agenda": true,
  "apps-section": false,
}

interface AppSidebarProps {
  workspaceName: string
  userName: string
  userEmail: string
  userAvatarUrl?: string
}

export function AppSidebar({
  workspaceName,
  userName,
  userEmail,
  userAvatarUrl,
}: AppSidebarProps) {
  const [supportModalOpen, setSupportModalOpen] = useState(false)
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
          "border-r bg-card shrink-0 flex flex-col h-full transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header with Logo and Toggle */}
        <div className="border-b">
          <div
            className={cn(
              "flex transition-all duration-300 ease-in-out",
              isCollapsed
                ? "flex-col items-center justify-center gap-4 py-4"
                : "flex-row items-center justify-between px-4 py-2"
            )}
          >
            <Link href="/dashboard" className="block">
              <div
                className={cn(
                  "relative transition-all duration-300 ease-in-out overflow-hidden",
                  isCollapsed ? "h-8 w-8" : "h-12 w-48"
                )}
              >
                <Image
                  src={
                    isCollapsed
                      ? "/images/beespo-logo-icon.svg"
                      : "/images/beespo-logo-full.svg"
                  }
                  alt="Beespo"
                  fill
                  className={cn(
                    "object-contain",
                    isCollapsed ? "object-center" : "object-left"
                  )}
                />
              </div>
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
            <div className="px-4 pb-4">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {workspaceName}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
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

          {/* Apps Section */}
          <SidebarAppsSection
            isCollapsed={isCollapsed}
            isExpanded={isGroupExpanded("apps-section")}
            onToggle={() => toggleGroup("apps-section")}
          />
        </nav>

        {/* Help & Support Button */}
        <div className={cn("border-t p-2", isCollapsed && "flex justify-center")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? "icon" : "default"}
                onClick={() => setSupportModalOpen(true)}
                className={cn(
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  isCollapsed ? "h-8 w-8" : "w-full justify-start gap-3"
                )}
              >
                <LifeBuoy className="h-4 w-4" />
                {!isCollapsed && <span>Help & Support</span>}
                <span className="sr-only">Help & Support</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Help & Support</TooltipContent>
          </Tooltip>
        </div>

        {/* User Profile */}
        <SidebarUserProfile
          name={userName}
          email={userEmail}
          avatarUrl={userAvatarUrl}
          isCollapsed={isCollapsed}
        />
      </aside>

      {/* Support Modal */}
      <SupportModal
        open={supportModalOpen}
        onOpenChange={setSupportModalOpen}
        userEmail={userEmail}
        userName={userName}
      />
    </TooltipProvider>
  )
}
