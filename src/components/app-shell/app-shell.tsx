"use client";

import * as React from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Menu, MoreHorizontal, Pin, UserCircle2 } from "lucide-react";
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
import { getBreadcrumbTrail } from "@/lib/navigation/breadcrumb-config";
import { APP_SHELL_NAV_ITEMS, type AppShellNavItem } from "./navigation-config";

const STORAGE_KEY = "beespo-app-shell-pinned";

type NavigationSidebarProps = {
  pinned: boolean;
  onTogglePinned: () => void;
  userName: string;
  userEmail: string;
  className?: string;
};

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  inCard?: boolean;
};

type AppShellProps = {
  children: ReactNode;
  secondaryPanel?: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
  userName?: string;
  userEmail?: string;
};

function ShellBreadcrumbs() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbTrail(pathname);

  if (!breadcrumbs.length) {
    return null;
  }

  return (
    <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="transition-colors hover:text-gray-900">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn(isLast && "text-gray-900")}>{crumb.label}</span>
            )}
            {!isLast ? <ChevronRight className="h-3 w-3" /> : null}
          </span>
        );
      })}
    </nav>
  );
}

function usePinnedSidebarState() {
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setPinned(true);
      } else if (stored === "false") {
        setPinned(false);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(pinned));
    } catch {
      // Ignore storage errors.
    }
  }, [pinned]);

  return {
    pinned,
    setPinned,
    togglePinned: () => setPinned((prev) => !prev),
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
        "group flex h-11 items-center rounded-xl text-sm font-medium transition-all duration-150 ease-in-out",
        "hover:bg-black/4",
        active
          ? "bg-black/5 text-gray-900"
          : "text-gray-500 hover:text-gray-900",
        collapsed ? "justify-center px-2" : "justify-between px-3"
      )}
    >
      <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        {!collapsed ? <span className={cn(active ? "text-gray-900" : "text-gray-700")}>{item.label}</span> : null}
      </span>
      {!collapsed && item.badgeCount ? (
        <Badge
          variant="secondary"
          className={cn(
            "h-5 rounded-full border-0 px-1.5 text-[11px] font-semibold",
            active ? "bg-black/10 text-gray-900" : "bg-black/5 text-gray-600"
          )}
        >
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
    <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
      <button
        className={cn(
          "flex h-11 items-center rounded-xl text-left text-sm font-medium text-gray-600 transition-all duration-150 ease-in-out hover:bg-black/4 hover:text-gray-900",
          collapsed ? "w-11 justify-center px-0" : "min-w-0 flex-1 gap-3 px-3"
        )}
      >
        <Avatar className="h-8 w-8 border border-black/10">
          <AvatarFallback className="bg-black/5 text-[10px] font-semibold text-gray-900">{initials}</AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <span className="min-w-0 flex-1 truncate">
            <span className="block truncate text-sm font-medium text-gray-900">{userName}</span>
            <span className="block truncate text-xs text-gray-500">{userEmail}</span>
          </span>
        ) : null}
      </button>

      {!collapsed ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition-all duration-150 ease-in-out hover:bg-black/4 hover:text-gray-900">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open profile menu</span>
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
      ) : null}
    </div>
  );
}

function NavigationSidebar({
  pinned,
  onTogglePinned,
  userName,
  userEmail,
  className,
}: NavigationSidebarProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const expanded = pinned || isHovered;
  const collapsed = !expanded;

  return (
    <aside
      className={cn(
        "fixed top-3 bottom-3 left-3 z-40 hidden shrink-0 text-gray-900 md:block",
        "transition-[width] duration-200 ease-in-out",
        expanded ? "w-[240px]" : "w-16",
        className
      )}
      onMouseEnter={() => {
        if (!pinned) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (!pinned) {
          setIsHovered(false);
        }
      }}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[18px] bg-background text-gray-900 transition-all duration-200 ease-in-out",
          pinned
            ? ""
            : expanded
              ? ""
              : ""
        )}
      >
        <div className={cn("flex items-center px-2.5 pb-3 pt-3", collapsed ? "justify-center" : "justify-between")}>
          <div
            className={cn(
              "flex h-11 items-center justify-center rounded-2xl bg-card text-sm font-semibold text-gray-900 shadow-sm transition-all duration-200",
              collapsed ? "w-11 text-base" : "w-11 text-base"
            )}
          >
            B
          </div>

          {expanded ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePinned}
              className={cn(
                "h-9 w-9 rounded-xl text-gray-500 transition-all duration-150 ease-in-out hover:bg-black/4 hover:text-gray-900",
                pinned && "bg-black/5 text-gray-900"
              )}
            >
              <Pin className={cn("h-4 w-4 transition-transform duration-200", !pinned && "rotate-45")} strokeWidth={1.75} />
              <span className="sr-only">{pinned ? "Unpin sidebar" : "Pin sidebar"}</span>
            </Button>
          ) : null}
        </div>

        <nav className="flex-1 px-2 pb-2">
          {APP_SHELL_NAV_ITEMS.map((item, index) => {
            const previousGroup = index === 0 ? null : APP_SHELL_NAV_ITEMS[index - 1]?.group;
            const showDivider = index > 0 && previousGroup !== item.group;

            return (
              <React.Fragment key={item.href}>
                {showDivider ? <div className="mx-2 my-2 h-px bg-gray-200" /> : null}
                <SidebarNavItem item={item} collapsed={collapsed} />
              </React.Fragment>
            );
          })}
        </nav>

        <div className="p-2 pt-1">
          <UserMenu collapsed={collapsed} userName={userName} userEmail={userEmail} />
        </div>
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
      <SheetContent side="left" className="w-[280px] border-r-0 bg-background p-0 text-gray-900">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Primary Beespo app navigation.</SheetDescription>
        <div className="flex h-full flex-col">
          <div className="px-4 pb-3 pt-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-base font-semibold text-gray-900 shadow-sm">
              B
            </div>
          </div>
          <Separator className="bg-gray-200" />
          <nav className="flex-1 space-y-1 p-2">
            {APP_SHELL_NAV_ITEMS.map((item) => (
              <SidebarNavItem key={`mobile-${item.href}`} item={item} collapsed={false} />
            ))}
          </nav>
          <div className="border-t border-gray-200 p-2">
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
  inCard = false,
  userName = "Preview User",
  userEmail = "preview@beespo.com",
}: ContentAreaProps & { userName?: string; userEmail?: string }) {
  if (inCard) {
    return (
      <main className={cn("h-full bg-card", className)}>
        <div className="h-full overflow-y-auto px-6 pt-6 pb-6">
          <div className={cn(fullWidth ? "max-w-none" : "mx-auto max-w-5xl")}>
            <ShellBreadcrumbs />
            {children}
          </div>
        </div>
      </main>
    );
  }

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
        <div className={cn(fullWidth ? "max-w-none" : "mx-auto max-w-5xl")}>
          <ShellBreadcrumbs />
          {children}
        </div>
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
  const { pinned, togglePinned } = usePinnedSidebarState();
  const navOffset = pinned ? "md:pl-[252px]" : "md:pl-[76px]";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationSidebar
        pinned={pinned}
        onTogglePinned={togglePinned}
        userName={userName}
        userEmail={userEmail}
        className={sidebarClassName}
      />

      <div className={cn("min-h-screen transition-[padding] duration-200 ease-in-out", navOffset)}>
        <div className="hidden h-screen p-3 md:block">
          <div className="flex h-full gap-3">
            {secondaryPanel ? (
              <aside className="w-[260px] shrink-0 overflow-hidden rounded-[18px] border border-border bg-card shadow-sm">
                {secondaryPanel}
              </aside>
            ) : null}

            <section className="min-w-0 flex-1 overflow-hidden rounded-[18px] border border-border bg-card shadow-sm">
              <ContentArea
                className={contentClassName}
                fullWidth
                inCard
                userName={userName}
                userEmail={userEmail}
              >
                {children}
              </ContentArea>
            </section>
          </div>
        </div>

        <div className="md:hidden">
          <ContentArea className={contentClassName} fullWidth userName={userName} userEmail={userEmail}>
            {children}
          </ContentArea>
        </div>
      </div>
    </div>
  );
}

export type { AppShellProps, ContentAreaProps };
