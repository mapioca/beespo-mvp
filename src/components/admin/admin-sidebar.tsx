"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  FileText,
  Ticket,
  Megaphone,
  LogOut,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/templates", icon: FileText, label: "Templates" },
  { href: "/invitations", icon: Ticket, label: "Invitations" },
  { href: "/release-notes", icon: Megaphone, label: "Release Notes" },
];

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
}

export function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">
            Beespo
          </span>
          <span className="ml-auto rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="border-t border-zinc-800 p-2">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* User Info */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <p className="text-sm font-medium text-zinc-200 truncate">{userName}</p>
        <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
      </div>
    </aside>
  );
}
