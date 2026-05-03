"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Loader2, RefreshCw } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast";
import { copyToClipboard } from "@/lib/slug-helpers";
import { getAudienceUrl } from "@/lib/audience-link";
import {
    getOrCreateAudienceLink,
    regenerateAudienceToken,
} from "@/lib/actions/audience-link-actions";

type AudienceLinkTabProps = {
    workspaceSlug: string | null;
    workspaceName: string;
    initialToken: string | null;
    canManage: boolean;
};

export function AudienceLinkTab({
    workspaceSlug,
    workspaceName,
    initialToken,
    canManage,
}: AudienceLinkTabProps) {
    const [token, setToken] = useState<string | null>(initialToken);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (token || !canManage) return;
        let cancelled = false;
        setIsLoading(true);
        getOrCreateAudienceLink()
            .then((result) => {
                if (cancelled) return;
                if ("error" in result && result.error) {
                    toast.error(result.error);
                } else if (result.link) {
                    setToken(result.link.token);
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token, canManage]);

    const url = useMemo(() => {
        if (!workspaceSlug || !token) return null;
        return getAudienceUrl(workspaceSlug, token);
    }, [workspaceSlug, token]);

    const handleCopy = async () => {
        if (!url) return;
        const ok = await copyToClipboard(url);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        const result = await regenerateAudienceToken();
        setIsRegenerating(false);
        if ("error" in result && result.error) {
            toast.error(result.error);
            return;
        }
        if (result.link) {
            setToken(result.link.token);
            toast.success("Link regenerated", {
                description: "The previous URL no longer works.",
            });
        }
    };

    const handleDownloadQr = () => {
        const canvas = qrRef.current?.querySelector("canvas");
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${workspaceSlug || "audience"}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (!canManage) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Audience Link</CardTitle>
                    <CardDescription>
                        Only workspace leaders and admins can manage the audience link.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!workspaceSlug) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Audience Link</CardTitle>
                    <CardDescription>
                        Set a workspace URL slug before configuring the audience link.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Audience Link</CardTitle>
                    <CardDescription>
                        One stable URL for {workspaceName}. Anyone with this link can view the program
                        you&rsquo;ve published from the planner. Bookmark it or print it as a QR code.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="audience-url">Public URL</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="audience-url"
                                readOnly
                                value={url ?? ""}
                                placeholder={isLoading ? "Loading…" : "—"}
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                disabled={!url}
                                aria-label="Copy link"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={!url || isRegenerating}>
                                    {isRegenerating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    <span className="ml-2">Regenerate link</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Regenerate audience link?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        The current URL will stop working immediately. Any printed QR codes
                                        or bookmarks pointing to it will need to be replaced. This cannot
                                        be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRegenerate}>
                                        Regenerate
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>QR Code</CardTitle>
                    <CardDescription>
                        Download and print this code so the audience can scan it from the chapel.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <div
                        ref={qrRef}
                        className="rounded-md border bg-white p-4"
                    >
                        {url ? (
                            <QRCodeCanvas value={url} size={192} level="M" includeMargin={false} />
                        ) : (
                            <div className="h-48 w-48" />
                        )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                        <p className="text-sm text-muted-foreground">
                            The QR code embeds the URL above. Regenerating the link replaces this code.
                        </p>
                        <Button variant="outline" onClick={handleDownloadQr} disabled={!url}>
                            <Download className="h-4 w-4" />
                            <span className="ml-2">Download PNG</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
