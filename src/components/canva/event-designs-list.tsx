"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Download,
    ExternalLink,
    Image as ImageIcon,
    Loader2,
    CheckCircle,
    AlertCircle,
    Clock,
} from "lucide-react";
import Image from "next/image";
import type { EventDesign, ExportStatus } from "@/types/canva";

interface EventDesignsListProps {
    designs: EventDesign[];
    isLoading: boolean;
    onEdit: (design: EventDesign) => void;
    onExport: (design: EventDesign) => void;
    exportingDesignId: string | null;
}

const statusConfig: Record<
    ExportStatus,
    { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
    pending: {
        label: "Not exported",
        icon: Clock,
        variant: "outline",
    },
    processing: {
        label: "Exporting...",
        icon: Loader2,
        variant: "secondary",
    },
    completed: {
        label: "Exported",
        icon: CheckCircle,
        variant: "default",
    },
    failed: {
        label: "Export failed",
        icon: AlertCircle,
        variant: "destructive",
    },
};

export function EventDesignsList({
    designs,
    isLoading,
    onEdit,
    onExport,
    exportingDesignId,
}: EventDesignsListProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-4">
                            <Skeleton className="h-32 w-full mb-3" />
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (designs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
                <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                    No designs yet. Create your first invitation above.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {designs.map((design) => {
                const isExporting = exportingDesignId === design.id;
                const statusInfo = statusConfig[design.export_status];
                const StatusIcon = statusInfo.icon;

                return (
                    <Card key={design.id}>
                        <CardContent className="p-4 space-y-3">
                            {/* Preview */}
                            <div className="relative aspect-[3/4] w-full rounded-md bg-muted overflow-hidden">
                                {design.public_url ? (
                                    <Image
                                        src={design.public_url}
                                        alt={design.title}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="space-y-1">
                                <p className="text-sm font-medium truncate">{design.title}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {design.width} x {design.height}
                                    </span>
                                    <Badge variant={statusInfo.variant} className="gap-1 text-xs">
                                        <StatusIcon
                                            className={`h-3 w-3 ${design.export_status === "processing" ? "animate-spin" : ""
                                                }`}
                                        />
                                        {statusInfo.label}
                                    </Badge>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1"
                                    onClick={() => onEdit(design)}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Edit
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1 gap-1"
                                    onClick={() => onExport(design)}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Download className="h-3 w-3" />
                                    )}
                                    Export
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
