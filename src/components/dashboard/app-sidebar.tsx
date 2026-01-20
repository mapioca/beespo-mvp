"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Home,
  FileText,
  Calendar,
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Briefcase,
  Megaphone,
  Mic,
  StickyNote,
  Users,
  Ticket,
  UserCog,
  PanelLeftClose,
  PanelLeft,
  LifeBuoy,
  LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SidebarUserProfile } from "@/components/dashboard/sidebar-user-profile"
import { Button } from "@/components/ui/button"
import { SupportModal } from "@/components/support/support-modal"

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", icon: Home, label: "Dashboard" },
      { href: "/calendar", icon: Calendar, label: "Calendar" },
      { href: "/events", icon: Ticket, label: "Events" },
      { href: "/tasks", icon: CheckSquare, label: "Tasks" },
    ],
  },
  {
    title: "Meetings",
    items: [
      { href: "/meetings", icon: CalendarDays, label: "Meetings" },
      { href: "/templates", icon: FileText, label: "Templates" },
    ],
  },
  {
    title: "Leadership",
    items: [
      { href: "/callings", icon: UserCog, label: "Callings" },
      { href: "/business", icon: Briefcase, label: "Business" },
      { href: "/announcements", icon: Megaphone, label: "Announcements" },
      { href: "/discussions", icon: MessageSquare, label: "Discussions" },
      { href: "/notes", icon: StickyNote, label: "Notes" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/speakers", icon: Mic, label: "Speakers" },
      { href: "/participants", icon: Users, label: "Participants" },
    ],
  },
]

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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const pathname = usePathname()

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
                  onClick={() => setIsCollapsed(!isCollapsed)}
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
          {navGroups.map((group, groupIndex) => (
            <div key={group.title} className={groupIndex > 0 ? "mt-6" : ""}>
              {/* Group Header - Hidden when collapsed */}
              {!isCollapsed && (
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">
                  {group.title}
                </h3>
              )}

              {/* Group Items */}
              <div className="space-y-1 px-2">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href))

                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground",
                        isCollapsed && "justify-center px-2"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  )

                  // Wrap in tooltip only when collapsed
                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <div key={item.href}>{linkContent}</div>
                })}
              </div>
            </div>
          ))}
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
