"use client";

import { useState, useCallback } from "react";
import { AppRail } from "@/components/dashboard/app-rail";
import { NavigationStoreHydrator } from "@/components/dashboard/navigation-store-hydrator";
import { WorkspaceStoreHydrator } from "@/components/dashboard/workspace-store-hydrator";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MobileNavContext } from "@/components/dashboard/mobile-nav-context";
import { DetailsPanelContext } from "@/components/ui/details-panel-context";
import { cn } from "@/lib/utils";
import type { UserNavigationItems } from "@/lib/navigation/types";

interface DashboardShellProps {
    children: React.ReactNode;
    userName: string;
    userEmail: string;
    userId: string;
    userRoleTitle?: string;
    workspaceName?: string;
    initialNavigationItems: UserNavigationItems;
}

export function DashboardShell({
    children,
    userName,
    userId,
    workspaceName,
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
                {workspaceName && <WorkspaceStoreHydrator workspaceName={workspaceName} />}
                <div className="flex h-screen-dynamic overflow-hidden overscroll-none bg-app-shell">
                <div className="relative z-20 hidden lg:flex">
                    <AppRail userName={userName} userId={userId} />
                </div>

                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="w-[300px] p-0">
                        <SheetTitle className="sr-only">Navigation</SheetTitle>
                        <SheetDescription className="sr-only">Workspace navigation drawer</SheetDescription>
                        <AppRail userName={userName} userId={userId} />
                    </SheetContent>
                </Sheet>

                {/* Content area: full-bleed main + optional details pane */}
                <div className="flex-1 min-w-0 min-h-0 flex items-stretch bg-app-shell">
                    <main className="relative z-0 flex-1 min-w-0 h-full min-h-0 overflow-hidden bg-app-main-card">
                        {children}
                    </main>
                    {/* Portal target for DetailsPanel — hidden on mobile, sized by panel open state on desktop */}
                    <div
                        ref={setPortalEl}
                        className={cn(
                            "hidden lg:block shrink-0 border-l border-app-island-border transition-[width] duration-200 ease-in-out",
                            panelVisible ? "w-[320px]" : "w-0 border-l-0"
                        )}
                    />
                </div>
                </div>
            </DetailsPanelContext.Provider>
        </MobileNavContext.Provider>
    );
}
