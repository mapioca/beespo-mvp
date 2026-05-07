"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Check, CheckCheck, Share2, Calendar, Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
} from "@/lib/actions/notification-actions"
import type { Notification } from "@/lib/notifications/types"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface NotificationBellProps {
    userId: string
    isCollapsed?: boolean
    /** Render as a compact icon button (no label text) */
    iconOnly?: boolean
}

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
    meeting_shared: Share2,
    meeting_starting_soon: Calendar,
    meeting_status_changed: Calendar,
    workspace_member_joined: Users,
}

export function NotificationBell({ userId, isCollapsed = false, iconOnly = false }: NotificationBellProps) {
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const fetchUnreadCount = useCallback(async () => {
        const count = await getUnreadCount()
        setUnreadCount(count)
    }, [])

    const fetchNotifications = useCallback(async () => {
        setLoading(true)
        const { notifications: data } = await getNotifications({ limit: 20 })
        setNotifications(data)
        setLoading(false)
    }, [])

    // Initial load
    useEffect(() => {
        fetchUnreadCount()
    }, [fetchUnreadCount])

    // Fetch full list when popover opens
    useEffect(() => {
        if (open) {
            fetchNotifications()
        }
    }, [open, fetchNotifications])

    // Supabase Realtime subscription for live updates
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel(`notifications-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification
                    setNotifications((prev) => [newNotification, ...prev])
                    setUnreadCount((prev) => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    const handleMarkRead = async (id: string) => {
        await markNotificationRead(id)
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead()
        setNotifications((prev) =>
            prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        )
        setUnreadCount(0)
    }

    const getNotificationHref = (notification: Notification): string | null => {
        const meta = notification.metadata
        if (meta?.meeting_id) return `/meetings/${meta.meeting_id}`
        return null
    }

    const useIconMode = iconOnly || isCollapsed

    const bellButton = (
        <PopoverTrigger asChild>
            <Button
                variant="ghost"
                size={useIconMode ? "icon" : "default"}
                className={cn(
                    "relative text-muted-foreground hover:text-foreground hover:bg-accent",
                    useIconMode ? "h-8 w-8 shrink-0" : "w-full justify-start gap-3"
                )}
            >
                <Bell className="h-4 w-4" />
                {!useIconMode && <span>Notifications</span>}
                {unreadCount > 0 && (
                    <span
                        className={cn(
                            "flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold",
                            useIconMode
                                ? "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5"
                                : "ml-auto h-5 min-w-5 px-1"
                        )}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
                <span className="sr-only">
                    {unreadCount > 0
                        ? `${unreadCount} unread notifications`
                        : "Notifications"}
                </span>
            </Button>
        </PopoverTrigger>
    )

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>{bellButton}</TooltipTrigger>
                <TooltipContent side="right">
                    Notifications
                    {unreadCount > 0 && ` (${unreadCount})`}
                </TooltipContent>
            </Tooltip>

            <PopoverContent
                side="right"
                align="end"
                className="w-80 p-0"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAllRead}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            Loading...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                No notifications yet
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const Icon = NOTIFICATION_ICONS[notification.type] || Bell
                            const href = getNotificationHref(notification)
                            const isUnread = !notification.read_at

                            const content = (
                                <div
                                    className={cn(
                                        "flex gap-3 px-4 py-3 border-b last:border-b-0 transition-colors",
                                        isUnread
                                            ? "bg-primary/5 hover:bg-primary/10"
                                            : "hover:bg-muted/50"
                                    )}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        <div
                                            className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-full",
                                                isUnread
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={cn(
                                                "text-sm leading-tight",
                                                isUnread && "font-medium"
                                            )}
                                        >
                                            {notification.title}
                                        </p>
                                        {notification.body && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {notification.body}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {formatDistanceToNow(
                                                new Date(notification.created_at),
                                                { addSuffix: true }
                                            )}
                                        </p>
                                    </div>
                                    {isUnread && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleMarkRead(notification.id)
                                            }}
                                            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                                            title="Mark as read"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            )

                            if (href) {
                                return (
                                    <Link
                                        key={notification.id}
                                        href={href}
                                        onClick={() => {
                                            if (isUnread) handleMarkRead(notification.id)
                                            setOpen(false)
                                        }}
                                        className="block"
                                    >
                                        {content}
                                    </Link>
                                )
                            }

                            return (
                                <div key={notification.id}>{content}</div>
                            )
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-2">
                    <Link
                        href="/settings/notifications"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                        Notification settings
                        <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}
