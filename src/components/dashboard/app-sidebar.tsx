"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
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

// Default expanded groups (Apps collapsed by default)
const defaultExpandedGroups: Record<string, boolean> = {
  "apps-section": false,
}

interface AppSidebarProps {
  workspaceName: string
  userName: string
  userEmail: string
  userAvatarUrl?: string
  userRoleTitle?: string
}

export function AppSidebar({
  workspaceName,
  userName,
  userEmail,
  userAvatarUrl,
  userRoleTitle,
}: AppSidebarProps) {
  const t = useTranslations("Dashboard.Layout.Sidebar")
  const tNav = useTranslations("Navigation")
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const pathname = usePathname()

  const navSections = useMemo((): NavSection[] => [
    {
      id: "main",
      title: "",
      items: [
        { href: "/dashboard", icon: Home, label: tNav("dashboard") },
        { href: "/calendar", icon: Calendar, label: tNav("calendar") },
        { href: "/meetings/overview", icon: CalendarDays, label: tNav("meetings") },
        { href: "/tasks", icon: CheckSquare, label: tNav("tasks") },
        { href: "/callings", icon: HandHeart, label: tNav("callings") },
        { href: "/forms", icon: ClipboardList, label: tNav("forms") },
        { href: "/tables", icon: Table2, label: tNav("tables") },
        { href: "/notebooks", icon: BookOpen, label: tNav("notebooks") },
      ],
    },
  ], [tNav])

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
                    {isCollapsed ? t("expand") : t("collapse")}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? t("expand") : t("collapse")}
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
                {!isCollapsed && <span>{t("helpSupport")}</span>}
                <span className="sr-only">{t("helpSupport")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("helpSupport")}</TooltipContent>
          </Tooltip>
        </div>

        {/* User Profile */}
        <SidebarUserProfile
          name={userName}
          email={userEmail}
          roleTitle={userRoleTitle}
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
