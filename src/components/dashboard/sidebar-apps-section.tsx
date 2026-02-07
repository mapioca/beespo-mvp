"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppWindow, ChevronRight, Plus, Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkspaceAppWithApp } from "@/types/apps";

interface SidebarAppsSectionProps {
    isCollapsed: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}

export function SidebarAppsSection({
    isCollapsed,
    isExpanded,
    onToggle,
}: SidebarAppsSectionProps) {
    const pathname = usePathname();
    const [connectedApps, setConnectedApps] = useState<WorkspaceAppWithApp[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetched = useRef(false);

    // Fetch workspace apps on mount
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        async function fetchApps() {
            try {
                const response = await fetch("/api/workspace-apps");
                if (response.ok) {
                    const data = await response.json();
                    const connected = (data.workspaceApps || []).filter(
                        (wa: WorkspaceAppWithApp) => wa.status === "connected"
                    );
                    setConnectedApps(connected);
                }
            } catch (error) {
                console.error("Failed to fetch workspace apps:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchApps();
    }, []);

    const isAppsPageActive = pathname === "/apps";

    // When sidebar is collapsed, show tooltip
    if (isCollapsed) {
        return (
            <div className="px-2 mt-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href="/apps"
                            className={cn(
                                "flex items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors w-full",
                                isAppsPageActive
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <AppWindow className="h-4 w-4 shrink-0" />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                        <div className="space-y-1">
                            <div className="font-semibold">Apps</div>
                            {connectedApps.length > 0 ? (
                                connectedApps.map((wa) => (
                                    <div key={wa.id} className="text-muted-foreground text-xs">
                                        {wa.app.name}
                                    </div>
                                ))
                            ) : (
                                <div className="text-muted-foreground text-xs">
                                    Browse Apps
                                </div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return (
        <div className="px-2 mt-1">
            <Collapsible open={isExpanded} onOpenChange={onToggle}>
                <CollapsibleTrigger
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
                        isAppsPageActive
                            ? "bg-accent/50 text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    aria-expanded={isExpanded}
                    aria-controls="nav-apps-section"
                >
                    <AppWindow className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">Apps</span>
                    <ChevronRight
                        className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            isExpanded && "rotate-90"
                        )}
                    />
                </CollapsibleTrigger>
                <CollapsibleContent
                    id="nav-apps-section"
                    className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
                >
                    <div className="mt-1 space-y-1">
                        {/* Connected Apps */}
                        {!isLoading &&
                            connectedApps.map((wa) => (
                                <Link
                                    key={wa.id}
                                    href={`/apps?open=${wa.app.slug}`}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors pl-10",
                                        "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <div className="flex h-4 w-4 items-center justify-center">
                                        {wa.app.icon_url ? (
                                            <img
                                                src={wa.app.icon_url}
                                                alt={wa.app.name}
                                                className="h-4 w-4"
                                            />
                                        ) : (
                                            <Puzzle className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <span className="truncate">{wa.app.name}</span>
                                </Link>
                            ))}

                        {/* Browse Apps link */}
                        <Link
                            href="/apps"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors pl-10",
                                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                isAppsPageActive && "bg-accent text-accent-foreground"
                            )}
                        >
                            <Plus className="h-4 w-4" />
                            <span>Browse Apps</span>
                        </Link>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
