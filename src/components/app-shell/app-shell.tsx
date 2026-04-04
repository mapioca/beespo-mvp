"use client";

import * as React from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, UserCircle2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { APP_SHELL_NAV_ITEMS, type AppShellNavItem } from "./navigation-config";

const STORAGE_KEY = "beespo-app-shell-collapsed";

type NavigationSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  userName: string;
  userEmail: string;
  className?: string;
};

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
};

type AppShellProps = {
  children: ReactNode;
  secondaryPanel?: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
  userName?: string;
  userEmail?: string;
};

function useCollapsedSidebarState() {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setCollapsed(true);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage errors.
    }
  }, [collapsed]);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed: () => setCollapsed((prev) => !prev),
  };
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavItem({ item, collapsed }: { item: AppShellNavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center rounded-md text-sm font-medium transition-colors duration-200",
        "hover:bg-gray-100",
        active
          ? "bg-primary-light text-primary"
          : "text-gray-600",
        collapsed ? "justify-center px-2 py-2" : "justify-between px-3 py-2"
      )}
    >
      <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}> 
        <Icon className="h-5 w-5" />
        {!collapsed ? <span>{item.label}</span> : null}
      </span>
      {!collapsed && item.badgeCount ? (
        <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
          {item.badgeCount}
        </Badge>
      ) : null}
    </Link>
  );
}

function UserMenu({ collapsed, userName, userEmail }: { collapsed: boolean; userName: string; userEmail: string }) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center rounded-md border border-border bg-card text-left transition-colors",
            "hover:bg-gray-100",
            collapsed ? "justify-center p-2" : "gap-3 p-2"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
              <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <UserCircle2 className="mr-2 h-4 w-4" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavigationSidebar({
  collapsed,
  onToggleCollapsed,
  userName,
  userEmail,
  className,
}: NavigationSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-screen shrink-0 border-r border-border bg-panel md:flex md:flex-col",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-16" : "w-[220px]",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <span className={cn("text-sm font-semibold text-foreground", collapsed && "sr-only")}>Beespo</span>
        <Button variant="ghost" size="icon" onClick={onToggleCollapsed}>
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-2">
        {APP_SHELL_NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <UserMenu collapsed={collapsed} userName={userName} userEmail={userEmail} />
      </div>
    </aside>
  );
}

function MobileSidebarDrawer({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] border-r border-border bg-panel p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Primary Beespo app navigation.</SheetDescription>
        <div className="flex h-full flex-col">
          <div className="h-14 px-4 py-4 text-sm font-semibold text-foreground">Beespo</div>
          <Separator />
          <nav className="flex-1 space-y-1 p-2">
            {APP_SHELL_NAV_ITEMS.map((item) => (
              <SidebarNavItem key={`mobile-${item.href}`} item={item} collapsed={false} />
            ))}
          </nav>
          <div className="border-t border-border p-2">
            <UserMenu collapsed={false} userName={userName} userEmail={userEmail} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ContentArea({
  children,
  className,
  fullWidth = false,
  userName = "Preview User",
  userEmail = "preview@beespo.com",
}: ContentAreaProps & { userName?: string; userEmail?: string }) {
  return (
    <main className={cn("flex-1 bg-background", className)}>
      <div className="h-14 border-b border-border px-4 md:hidden">
        <div className="flex h-full items-center justify-between">
          <MobileSidebarDrawer userName={userName} userEmail={userEmail} />
          <span className="text-sm font-semibold text-foreground">Beespo</span>
          <span className="w-9" aria-hidden />
        </div>
      </div>
      <div className="px-6 pt-6">
        <div className={cn(fullWidth ? "max-w-none" : "mx-auto max-w-5xl")}>{children}</div>
      </div>
    </main>
  );
}

export function AppShell({
  children,
  secondaryPanel,
  sidebarClassName,
  contentClassName,
  userName = "Preview User",
  userEmail = "preview@beespo.com",
}: AppShellProps) {
  const { collapsed, toggleCollapsed } = useCollapsedSidebarState();
  const contentOffset = secondaryPanel
    ? collapsed
      ? "md:pl-[320px]"
      : "md:pl-[480px]"
    : collapsed
      ? "md:pl-16"
      : "md:pl-[220px]";
  const secondaryLeft = collapsed ? "left-16" : "left-[220px]";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        userName={userName}
        userEmail={userEmail}
        className={sidebarClassName}
      />

      {secondaryPanel ? (
        <aside
          className={cn(
            "fixed inset-y-0 z-20 hidden w-[260px] border-r border-border bg-card md:block",
            secondaryLeft
          )}
        >
          {secondaryPanel}
        </aside>
      ) : null}

      <div className={cn(contentOffset)}>
        <ContentArea className={contentClassName} fullWidth userName={userName} userEmail={userEmail}>
          {children}
        </ContentArea>
      </div>
    </div>
  );
}

export type { AppShellProps, ContentAreaProps };
