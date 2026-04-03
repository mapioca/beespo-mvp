"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NavigationStoreHydrator } from "@/components/dashboard/navigation-store-hydrator";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MobileNavContext } from "@/components/dashboard/mobile-nav-context";
import type { UserNavigationItems } from "@/lib/navigation/types";

interface DashboardShellProps {
    children: React.ReactNode;
    workspaceName: string;
    userName: string;
    userEmail: string;
    userId: string;
    userRoleTitle?: string;
    initialNavigationItems: UserNavigationItems;
}

export function DashboardShell({
    children,
    workspaceName,
    userName,
    userEmail,
    userId,
    userRoleTitle,
    initialNavigationItems,
}: DashboardShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <MobileNavContext.Provider value={{ mobileOpen, setMobileOpen }}>
            <NavigationStoreHydrator initialItems={initialNavigationItems} />
            <div className="flex h-screen-dynamic overflow-hidden overscroll-none bg-app-shell">
            <div className="hidden lg:flex">
                <AppSidebar
                    workspaceName={workspaceName}
                    userName={userName}
                    userEmail={userEmail}
                    userId={userId}
                    userRoleTitle={userRoleTitle}
                />
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-[300px] p-0">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SheetDescription className="sr-only">Workspace navigation drawer</SheetDescription>
                    <AppSidebar
                        workspaceName={workspaceName}
                        userName={userName}
                        userEmail={userEmail}
                        userId={userId}
                        userRoleTitle={userRoleTitle}
                        className="w-full"
                        forceCollapsed={false}
                        hideCollapseToggle
                    />
                </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0 min-h-0 bg-app-shell p-0 sm:p-2.5 xl:p-3 2xl:p-4">
                <main className="h-full min-h-0 overflow-hidden rounded-none border-0 bg-app-island shadow-none sm:rounded-[16px] sm:border sm:border-app-island sm:shadow-[var(--shadow-app-island)]">
                    {children}
                </main>
            </div>
            </div>
        </MobileNavContext.Provider>
    );
}
