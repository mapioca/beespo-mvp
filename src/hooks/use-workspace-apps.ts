"use client";

import { useEffect } from "react";
import { useAppsStore } from "@/stores/apps-store";
import type { WorkspaceAppWithApp } from "@/types/apps";

/**
 * Hook to fetch and manage workspace apps
 * Automatically fetches apps on mount and provides loading/error states
 */
export function useWorkspaceApps() {
    const {
        workspaceApps,
        isLoadingWorkspaceApps,
        setWorkspaceApps,
        setLoadingWorkspaceApps,
        isAppConnected,
        hasFeature,
    } = useAppsStore();

    useEffect(() => {
        let isMounted = true;

        async function fetchWorkspaceApps() {
            // Don't refetch if already loaded
            if (workspaceApps.length > 0) return;

            setLoadingWorkspaceApps(true);

            try {
                const response = await fetch("/api/workspace-apps");
                if (response.ok && isMounted) {
                    const data = await response.json();
                    setWorkspaceApps(data.workspaceApps || []);
                }
            } catch (error) {
                console.error("Failed to fetch workspace apps:", error);
            } finally {
                if (isMounted) {
                    setLoadingWorkspaceApps(false);
                }
            }
        }

        fetchWorkspaceApps();

        return () => {
            isMounted = false;
        };
    }, []);

    const connectedApps = workspaceApps.filter(
        (wa: WorkspaceAppWithApp) => wa.status === "connected"
    );

    const isCanvaConnected = isAppConnected("canva");

    return {
        workspaceApps,
        connectedApps,
        isLoading: isLoadingWorkspaceApps,
        isCanvaConnected,
        isAppConnected,
        hasFeature,
    };
}
