"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Calendar,
  CalendarDays,
  CheckSquare,
  HandHeart,
  Database,
  LayoutTemplate,
  Search,
  LogOut,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BeespoLogo } from "@/components/ui/beespo-logo"
import { useCommandPaletteStore } from "@/stores/command-palette-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/schedule/calendar", icon: Calendar, label: "Schedule" },
  { href: "/meetings", icon: CalendarDays, label: "Meetings" },
  { href: "/library", icon: LayoutTemplate, label: "Templates" },
  { href: "/callings", icon: HandHeart, label: "Callings" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/data", icon: Database, label: "Data" },
]

interface AppRailProps {
  userName: string
  userId: string
}

export function AppRail({ userName, userId }: AppRailProps) {
  const pathname = usePathname()
  const router = useRouter()
  const toggleCommandPalette = useCommandPaletteStore((state) => state.toggle)

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const initials = getInitials(userName)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="w-[52px] h-full bg-app-shell border-r border-app-island-border flex flex-col">
      {/* Logo */}
      <div className="flex h-[44px] items-center justify-center shrink-0">
        <Link href="/dashboard" aria-label="Beespo home">
          <BeespoLogo className="h-5 w-5" />
        </Link>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 overflow-y-auto py-1 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "flex items-center justify-center h-[36px] w-full rounded-md mb-0.5 transition-colors",
                isActive
                  ? "bg-nav-selected text-nav-text-strong"
                  : "text-nav hover:bg-nav-hover hover:text-nav-strong"
              )}
            >
              <Icon className="h-[18px] w-[18px] stroke-[1.75]" />
            </Link>
          )
        })}
      </nav>

      {/* Search */}
      <div className="shrink-0 px-1 pb-1.5">
        <button
          type="button"
          onClick={toggleCommandPalette}
          aria-label="Open command palette"
          className="flex items-center justify-center h-[30px] w-full rounded-md text-nav hover:bg-nav-hover hover:text-nav-strong transition-colors"
        >
          <Search className="h-[18px] w-[18px] stroke-[1.75]" />
        </button>
      </div>

      {/* User menu */}
      <div className="shrink-0 px-1 pb-2 w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="User menu"
              className="flex items-center justify-center h-[32px] w-[32px] rounded-full bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors mx-auto"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">ID: {userId.slice(0, 8)}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
