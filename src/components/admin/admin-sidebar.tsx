"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    FileText,
    Shield,
    LogOut,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/templates", label: "Templates", icon: FileText },
] as const;

export function AdminSidebar() {
    const pathname = usePathname();

    const handleLogout = async () => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );
        await supabase.auth.signOut();
        window.location.href = "/admin/login";
    };

    return (
        <aside className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-300">
            {/* Brand */}
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
                <Shield className="h-5 w-5 text-red-500" />
                <span className="text-sm font-semibold tracking-tight text-white">
                    Admin Console
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-2 py-4">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-zinc-800 text-white"
                                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-zinc-800 p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </aside>
    );
}
