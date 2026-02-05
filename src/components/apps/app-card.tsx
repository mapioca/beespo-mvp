"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Clock, Puzzle } from "lucide-react";
import type { App, WorkspaceAppStatus } from "@/types/apps";

interface AppCardProps {
    app: App;
    status: WorkspaceAppStatus | null;
    onClick: () => void;
}

const statusConfig: Record<
    WorkspaceAppStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
    connected: {
        label: "Connected",
        variant: "default",
        icon: CheckCircle,
    },
    pending: {
        label: "Pending",
        variant: "secondary",
        icon: Clock,
    },
    disconnected: {
        label: "Disconnected",
        variant: "outline",
        icon: AlertCircle,
    },
    error: {
        label: "Error",
        variant: "destructive",
        icon: AlertCircle,
    },
};

const categoryColors: Record<string, string> = {
    design: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    productivity: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    communication: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    analytics: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

export function AppCard({ app, status, onClick }: AppCardProps) {
    const statusInfo = status ? statusConfig[status] : null;
    const StatusIcon = statusInfo?.icon;

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                status === "connected" && "border-primary/50 bg-primary/5"
            )}
            onClick={onClick}
        >
            <CardContent className="flex flex-col gap-3 p-4">
                {/* Header with icon and status */}
                <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        {app.icon_url ? (
                            <img
                                src={app.icon_url}
                                alt={app.name}
                                className="h-8 w-8"
                            />
                        ) : (
                            <Puzzle className="h-6 w-6 text-muted-foreground" />
                        )}
                    </div>
                    {statusInfo && StatusIcon && (
                        <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                        </Badge>
                    )}
                </div>

                {/* App info */}
                <div className="space-y-1">
                    <h3 className="font-semibold">{app.name}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                        {app.description}
                    </p>
                </div>

                {/* Category */}
                {app.category && (
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                categoryColors[app.category] || "bg-gray-100 text-gray-700"
                            )}
                        >
                            {app.category}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
