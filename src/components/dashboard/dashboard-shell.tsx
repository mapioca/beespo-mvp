"use client";

import { useState, useCallback } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { NavigationStoreHydrator } from "@/components/dashboard/navigation-store-hydrator";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MobileNavContext } from "@/components/dashboard/mobile-nav-context";
import { DetailsPanelContext } from "@/components/ui/details-panel-context";
import { cn } from "@/lib/utils";
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
    const [panelVisible, setPanelVisible] = useState(false);
    const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

    const reportOpen = useCallback((open: boolean) => {
        setPanelVisible(open);
    }, []);

    return (
        <MobileNavContext.Provider value={{ mobileOpen, setMobileOpen }}>
            <DetailsPanelContext.Provider value={{ portalEl, reportOpen }}>
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
                            forceExpanded
                            hidePinToggle
                        />
                    </SheetContent>
                </Sheet>

                {/* Content area: main island + optional details panel island side by side */}
                <div className="flex-1 min-w-0 min-h-0 flex items-stretch bg-app-shell p-0 sm:p-1.5 sm:gap-1 xl:p-2 xl:gap-1.5 2xl:p-2.5 2xl:gap-1.5">
                    <main className="flex-1 min-w-0 h-full min-h-0 overflow-hidden rounded-none border-0 bg-app-island shadow-none sm:rounded-[16px] sm:border sm:border-app-island sm:shadow-[var(--shadow-app-island)]">
                        {children}
                    </main>
                    {/* Portal target for DetailsPanel — hidden on mobile, sized by panel open state on desktop */}
                    <div
                        ref={setPortalEl}
                        className={cn(
                            "hidden lg:block shrink-0 transition-[width] duration-200 ease-in-out",
                            panelVisible ? "w-[320px]" : "w-0"
                        )}
                    />
                </div>
                </div>
            </DetailsPanelContext.Provider>
        </MobileNavContext.Provider>
    );
}
