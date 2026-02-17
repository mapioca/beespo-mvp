"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppsStore } from "@/stores/apps-store";
import { toast } from "@/lib/toast";
import {
    CheckCircle,
    ExternalLink,
    Loader2,
    Puzzle,
    Shield,
    Sparkles,
    Trash2,
} from "lucide-react";
import Image from "next/image";
import type { App, WorkspaceAppWithApp } from "@/types/apps";

interface AppDetailModalProps {
    app: App | null;
    isOpen: boolean;
    onClose: () => void;
    workspaceApp?: WorkspaceAppWithApp;
    canManage: boolean;
}

const featureLabels: Record<string, string> = {
    event_invitations: "Create event invitations",
    design_studio: "Access design studio",
};

export function AppDetailModal({
    app,
    isOpen,
    onClose,
    workspaceApp,
    canManage,
}: AppDetailModalProps) {
    const router = useRouter();
    const { setConnectingApp, setConnectionError, updateWorkspaceAppStatus, removeWorkspaceApp } =
        useAppsStore();

    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    if (!app) return null;

    const isConnected = workspaceApp?.status === "connected";
    const isPending = workspaceApp?.status === "pending";

    const handleConnect = async () => {
        if (!canManage) {
            toast.error("Permission Denied", { description: "Only admins and leaders can connect apps." });
            return;
        }

        setIsConnecting(true);
        setConnectingApp(app.slug);

        try {
            // If already pending, go directly to OAuth
            if (isPending && app.requires_oauth) {
                onClose();
                window.location.href = `/api/apps/${app.slug}/authorize`;
                return;
            }

            // First, create the workspace app record
            const response = await fetch("/api/workspace-apps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ app_slug: app.slug }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to initiate connection");
            }

            // If OAuth is required, redirect to authorize endpoint
            if (data.requiresOAuth) {
                // Close modal before redirect
                onClose();
                // Redirect to OAuth flow
                window.location.href = `/api/apps/${app.slug}/authorize`;
                return;
            }

            // If no OAuth required, the app is now connected
            updateWorkspaceAppStatus(app.id, "connected");
            toast.success("App Connected", { description: `${app.name} has been connected to your workspace.` });
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to connect app";
            setConnectionError(message);
            toast.error("Connection Failed", { description: message });
        } finally {
            setIsConnecting(false);
            setConnectingApp(null);
        }
    };

    const handleDisconnect = async () => {
        if (!canManage) {
            toast.error("Permission Denied", { description: "Only admins and leaders can disconnect apps." });
            return;
        }

        setIsDisconnecting(true);

        try {
            const response = await fetch(`/api/apps/${app.slug}/disconnect`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to disconnect app");
            }

            removeWorkspaceApp(app.id);
            toast.success("App Disconnected", { description: `${app.name} has been disconnected from your workspace.` });
            router.refresh();
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to disconnect app";
            toast.error("Disconnection Failed", { description: message });
        } finally {
            setIsDisconnecting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                            {app.icon_url ? (
                                <Image
                                    src={app.icon_url}
                                    alt={app.name}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10"
                                    unoptimized
                                />
                            ) : (
                                <Puzzle className="h-7 w-7 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="flex items-center gap-2">
                                {app.name}
                                {isConnected && (
                                    <Badge variant="default" className="gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Connected
                                    </Badge>
                                )}
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                {app.description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Features */}
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-sm font-medium">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Features Unlocked
                        </h4>
                        <ul className="space-y-1.5 pl-6">
                            {app.features.map((feature) => (
                                <li
                                    key={feature}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                    {featureLabels[feature] || feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* OAuth Scopes */}
                    {app.requires_oauth && app.oauth_scopes.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="flex items-center gap-2 text-sm font-medium">
                                <Shield className="h-4 w-4 text-primary" />
                                Permissions Required
                            </h4>
                            <ul className="space-y-1.5 pl-6">
                                {app.oauth_scopes.map((scope) => (
                                    <li
                                        key={scope}
                                        className="text-sm text-muted-foreground"
                                    >
                                        {scope.replace(/[_:]/g, " ")}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    {isConnected ? (
                        <>
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => {
                                    // Navigate to app-specific page if exists
                                    onClose();
                                }}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open {app.name}
                            </Button>
                            {canManage && (
                                <Button
                                    variant="ghost"
                                    className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={handleDisconnect}
                                    disabled={isDisconnecting}
                                >
                                    {isDisconnecting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                    Disconnect from Workspace
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button
                            className="w-full gap-2"
                            onClick={handleConnect}
                            disabled={isConnecting || !canManage}
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : isPending ? (
                                <>
                                    <ExternalLink className="h-4 w-4" />
                                    Continue Setup
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="h-4 w-4" />
                                    {canManage
                                        ? "Add to Workspace"
                                        : "Ask an admin to connect"}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
