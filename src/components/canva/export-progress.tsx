"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCanvaExportState } from "@/stores/canva-store";
import { Loader2 } from "lucide-react";

export function ExportProgress() {
    const { exportProgress, exportError } = useCanvaExportState();

    if (exportError) {
        return (
            <Card className="border-destructive">
                <CardContent className="p-4">
                    <p className="text-sm text-destructive">{exportError}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">Exporting design...</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                    This may take a moment. Please don&apos;t close this window.
                </p>
            </CardContent>
        </Card>
    );
}
