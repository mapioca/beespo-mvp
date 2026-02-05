"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppCard } from "@/components/apps/app-card";
import { AppDetailModal } from "@/components/apps/app-detail-modal";
import { useAppsStore } from "@/stores/apps-store";
import { useToast } from "@/lib/hooks/use-toast";
import { AppWindow, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { App, WorkspaceAppWithApp } from "@/types/apps";

interface AppsClientProps {
    apps: App[];
    workspaceApps: WorkspaceAppWithApp[];
    userRole: string;
}

export function AppsClient({ apps, workspaceApps, userRole }: AppsClientProps) {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { setApps, setWorkspaceApps } = useAppsStore();

    const [selectedApp, setSelectedApp] = useState<App | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const canManageApps = ["admin", "leader"].includes(userRole);

    // Initialize store with SSR data
    useEffect(() => {
        setApps(apps);
        setWorkspaceApps(workspaceApps);
    }, [apps, workspaceApps, setApps, setWorkspaceApps]);

    // Handle OAuth callback results
    useEffect(() => {
        const connected = searchParams.get("connected");
        const error = searchParams.get("error");

        if (connected) {
            toast({
                title: "App Connected",
                description: `${connected.charAt(0).toUpperCase() + connected.slice(1)} has been connected to your workspace.`,
            });
            // Clear the query params
            window.history.replaceState({}, "", "/apps");
        }

        if (error) {
            toast({
                title: "Connection Failed",
                description: error,
                variant: "destructive",
            });
            // Clear the query params
            window.history.replaceState({}, "", "/apps");
        }
    }, [searchParams, toast]);

    // Filter apps by search query
    const filteredApps = apps.filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Check if an app is connected
    const getAppStatus = (appId: string) => {
        const workspaceApp = workspaceApps.find((wa) => wa.app_id === appId);
        return workspaceApp?.status || null;
    };

    const handleAppClick = (app: App) => {
        setSelectedApp(app);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <AppWindow className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Apps Hub</h1>
                        <p className="text-sm text-muted-foreground">
                            Connect apps to enhance your workspace
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search apps..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Connected Apps Section */}
            {workspaceApps.filter((wa) => wa.status === "connected").length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-medium">Connected Apps</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {workspaceApps
                            .filter((wa) => wa.status === "connected")
                            .map((wa) => (
                                <AppCard
                                    key={wa.id}
                                    app={wa.app}
                                    status="connected"
                                    onClick={() => handleAppClick(wa.app)}
                                />
                            ))}
                    </div>
                </div>
            )}

            {/* All Apps Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-medium">
                    {workspaceApps.filter((wa) => wa.status === "connected").length > 0
                        ? "Available Apps"
                        : "All Apps"}
                </h2>
                {filteredApps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                        <AppWindow className="h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-4 text-sm text-muted-foreground">
                            {searchQuery
                                ? "No apps match your search"
                                : "No apps available"}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredApps
                            .filter((app) => getAppStatus(app.id) !== "connected")
                            .map((app) => (
                                <AppCard
                                    key={app.id}
                                    app={app}
                                    status={getAppStatus(app.id)}
                                    onClick={() => handleAppClick(app)}
                                />
                            ))}
                    </div>
                )}
            </div>

            {/* App Detail Modal */}
            <AppDetailModal
                app={selectedApp}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedApp(null);
                }}
                workspaceApp={
                    selectedApp
                        ? workspaceApps.find((wa) => wa.app_id === selectedApp.id)
                        : undefined
                }
                canManage={canManageApps}
            />
        </div>
    );
}
