"use client"

import { useState, useEffect, useCallback } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, User, CreditCard, Bell, Sparkles, LogOut, BookOpen, MessageSquare, Pin, PinOff } from "lucide-react"
import { signOutAction } from "@/lib/actions/auth-actions"
import { getUnreadCount } from "@/lib/actions/notification-actions"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { SupportModal } from "@/components/support/support-modal"

interface SidebarUserProfileProps {
    name?: string
    email?: string
    userId: string
    roleTitle?: string
    avatarUrl?: string
    isCollapsed?: boolean
    isPinned?: boolean
    onTogglePinned?: () => void
    onMenuOpenChange?: (open: boolean) => void
}

export function SidebarUserProfile({
    name,
    email,
    userId,
    roleTitle,
    avatarUrl,
    isCollapsed = false,
    isPinned = false,
    onTogglePinned,
    onMenuOpenChange
}: SidebarUserProfileProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const handleOpenChange = (open: boolean) => {
        setDropdownOpen(open)
        onMenuOpenChange?.(open)
    }
    const [supportModalOpen, setSupportModalOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [realtimeEnabled, setRealtimeEnabled] = useState(false)

    const initials = name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    // Fetch unread notification count
    const fetchUnreadCount = useCallback(async () => {
        const count = await getUnreadCount()
        setUnreadCount(count)
    }, [])

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        let cancelled = false

        const activate = async () => {
            if (cancelled) return
            await fetchUnreadCount()
            if (!cancelled) {
                setRealtimeEnabled(true)
            }
        }

        timeoutId = setTimeout(() => {
            void activate()
        }, 1200)

        return () => {
            cancelled = true
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [fetchUnreadCount])

    // Supabase Realtime subscription for live unread count
    useEffect(() => {
        if (!realtimeEnabled) {
            return
        }

        const supabase = createClient()
        const channel = supabase
            .channel(`sidebar-notifications-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    setUnreadCount((prev) => prev + 1)
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    // Refetch on update (mark-as-read)
                    fetchUnreadCount()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, fetchUnreadCount, realtimeEnabled])

    const avatarElement = (
        <Avatar className={cn("border shrink-0", isCollapsed ? "h-8 w-8" : "h-9 w-9")}>
            <AvatarImage src={avatarUrl} alt={name || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
    )

    const dropdownMenu = (
        <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                {isCollapsed ? (
                    <button className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" onMouseEnter={() => setRealtimeEnabled(true)} onFocus={() => setRealtimeEnabled(true)}>
                        {avatarElement}
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-primary-foreground">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>
                ) : (
                    <Button variant="ghost" size="icon" className="text-nav hover:text-nav-strong relative h-8 w-8 shrink-0" onMouseEnter={() => setRealtimeEnabled(true)} onFocus={() => setRealtimeEnabled(true)}>
                        <MoreHorizontal className="h-4 w-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-primary-foreground">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                        <span className="sr-only">Open menu</span>
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align={isCollapsed ? "center" : "end"} side="right" forceMount>
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Account settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings?tab=notifications" className="cursor-pointer">
                            <Bell className="mr-2 h-4 w-4" />
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Billing</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/changelog" className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4" />
                            <span>What&apos;s New</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        onClick={(e) => {
                            e.preventDefault();
                            onTogglePinned?.();
                        }} 
                        className="cursor-pointer"
                    >
                        {isPinned ? (
                            <>
                                <PinOff className="mr-2 h-4 w-4" />
                                <span>Unpin Sidebar</span>
                                <span className="ml-auto text-[10px] opacity-50 font-sans tracking-widest">⌘B</span>
                            </>
                        ) : (
                            <>
                                <Pin className="mr-2 h-4 w-4" />
                                <span>Pin Sidebar</span>
                                <span className="ml-auto text-[10px] opacity-50 font-sans tracking-widest">⌘B</span>
                            </>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/docs" className="cursor-pointer">
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span>Documentation</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSupportModalOpen(true)} className="cursor-pointer">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Submit a request</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100/50 p-0"
                    asChild
                >
                    <form action={signOutAction} className="w-full">
                        <button type="submit" className="flex items-center w-full px-2 py-1.5">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </button>
                    </form>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    if (isCollapsed) {
        return (
            <>
                <div className="flex justify-start border-t border-border/70 p-2 pl-2.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {dropdownMenu}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p className="font-medium">{name}</p>
                            {roleTitle && <p className="text-xs text-muted-foreground">{roleTitle}</p>}
                            <p className="text-xs text-muted-foreground">{email}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <SupportModal
                    open={supportModalOpen}
                    onOpenChange={setSupportModalOpen}
                    userEmail={email || ""}
                    userName={name || ""}
                />
            </>
        )
    }

    return (
        <>
            <div className="border-t border-border/70 py-3 pl-2 pr-3">
                <div className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        {avatarElement}
                        <div className="grid gap-0.5 text-left text-sm leading-tight">
                            <span className="text-nav-strong w-28 truncate font-semibold">{name}</span>
                            {roleTitle && (
                                <span className="text-nav-muted w-28 truncate text-xs">{roleTitle}</span>
                            )}
                        </div>
                    </div>
                    {dropdownMenu}
                </div>
            </div>
            <SupportModal
                open={supportModalOpen}
                onOpenChange={setSupportModalOpen}
                userEmail={email || ""}
                userName={name || ""}
            />
        </>
    )
}
