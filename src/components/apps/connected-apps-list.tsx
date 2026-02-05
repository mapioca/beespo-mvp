"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Puzzle } from "lucide-react";
import type { WorkspaceAppWithApp } from "@/types/apps";

interface ConnectedAppsListProps {
    apps: WorkspaceAppWithApp[];
    isCollapsed: boolean;
}

export function ConnectedAppsList({ apps, isCollapsed }: ConnectedAppsListProps) {
    const connectedApps = apps.filter((wa) => wa.status === "connected");

    if (connectedApps.length === 0) {
        return null;
    }

    return (
        <div className="space-y-1">
            {connectedApps.map((wa) => (
                <Link
                    key={wa.id}
                    href={`/apps?open=${wa.app.slug}`}
                    className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isCollapsed && "justify-center px-2"
                    )}
                >
                    <div className="flex h-5 w-5 items-center justify-center">
                        {wa.app.icon_url ? (
                            <img
                                src={wa.app.icon_url}
                                alt={wa.app.name}
                                className="h-5 w-5"
                            />
                        ) : (
                            <Puzzle className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                    {!isCollapsed && (
                        <span className="truncate">{wa.app.name}</span>
                    )}
                </Link>
            ))}
        </div>
    );
}
