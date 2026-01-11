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
import { MoreHorizontal, User, CreditCard, Bell, LogOut } from "lucide-react"
import { signOutAction } from "@/lib/actions/auth-actions"
import Link from "next/link"

interface SidebarUserProfileProps {
    name?: string
    email?: string
    avatarUrl?: string
}

export function SidebarUserProfile({ name, email, avatarUrl }: SidebarUserProfileProps) {
    const initials = name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    return (
        <div className="border-t p-4">
            <div className="flex items-center justify-between w-full group">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="h-9 w-9 border">
                        <AvatarImage src={avatarUrl} alt={name || "User"} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5 text-left text-sm leading-tight">
                        <span className="font-semibold truncate w-32">{name}</span>
                        <span className="text-xs text-muted-foreground truncate w-32">{email}</span>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" side="right" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{name}</p>
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
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100/50"
                            onClick={() => signOutAction()}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
