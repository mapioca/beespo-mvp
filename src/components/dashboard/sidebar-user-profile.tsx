"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, User, CreditCard, Bell, Sparkles, LogOut } from "lucide-react"
import { signOutAction } from "@/lib/actions/auth-actions"
import Link from "next/link"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SidebarUserProfileProps {
    name?: string
    email?: string
    roleTitle?: string
    avatarUrl?: string
    isCollapsed?: boolean
}

export function SidebarUserProfile({ name, email, roleTitle, avatarUrl, isCollapsed = false }: SidebarUserProfileProps) {
    const initials = name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    const avatarElement = (
        <Avatar className={cn("border shrink-0", isCollapsed ? "h-8 w-8" : "h-9 w-9")}>
            <AvatarImage src={avatarUrl} alt={name || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
    )

    const dropdownMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {isCollapsed ? (
                    <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        {avatarElement}
                    </button>
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align={isCollapsed ? "center" : "end"} side="right" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{name}</p>
                        {roleTitle && (
                            <p className="text-xs leading-none text-muted-foreground">{roleTitle}</p>
                        )}
                        <p className="text-xs leading-none text-muted-foreground">{email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Account settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Billing</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Notifications</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/changelog" className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4" />
                            <span>What&apos;s New</span>
                        </Link>
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
            <div className="border-t p-2 flex justify-center">
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
        )
    }

    return (
        <div className="border-t p-4">
            <div className="flex items-center justify-between w-full group">
                <div className="flex items-center gap-3 overflow-hidden">
                    {avatarElement}
                    <div className="grid gap-0.5 text-left text-sm leading-tight">
                        <span className="font-semibold truncate w-32">{name}</span>
                        {roleTitle && (
                            <span className="text-xs text-muted-foreground truncate w-32">{roleTitle}</span>
                        )}
                    </div>
                </div>
                {dropdownMenu}
            </div>
        </div>
    )
}
