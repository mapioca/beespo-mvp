"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCanvaStore } from "@/stores/canva-store";
import { toast } from "@/lib/toast";
import { EventDesignsList } from "./event-designs-list";
import { EventReferencePanel } from "./event-reference-panel";
import { ExportProgress } from "./export-progress";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import { DESIGN_PRESETS } from "@/types/canva";
import type { EventDesign } from "@/types/canva";

interface DesignInvitationModalProps {
    eventId: string | null;
    eventTitle: string | null;
    eventData?: {
        date: string;
        time: string;
        location: string | null;
        description: string | null;
    };
    isOpen: boolean;
    onClose: () => void;
}

export function DesignInvitationModal({
    eventId,
    eventTitle,
    eventData,
    isOpen,
    onClose,
}: DesignInvitationModalProps) {
    const {
        designs,
        isLoadingDesigns,
        isCreating,
        createError,
        exportingDesignId,
        setDesigns,
        addDesign,
        setLoadingDesigns,
        setCreating,
        setCreateError,
        startExport,
        completeExport,
        failExport,
        clearExportState,
    } = useCanvaStore();

    const [selectedPreset, setSelectedPreset] = useState("0");

    const fetchDesigns = useCallback(async () => {
        if (!eventId) return;

        setLoadingDesigns(true);
        try {
            const response = await fetch(`/api/canva/designs?event_id=${eventId}`);
            if (response.ok) {
                const data = await response.json();
                setDesigns(data.designs || []);
            }
        } catch (error) {
            console.error("Failed to fetch designs:", error);
        } finally {
            setLoadingDesigns(false);
        }
    }, [eventId, setDesigns, setLoadingDesigns]);

    // Fetch designs when modal opens
    useEffect(() => {
        if (isOpen && eventId) {
            fetchDesigns();
        }
    }, [isOpen, eventId, fetchDesigns]);

    const handleCreateDesign = async () => {
        if (!eventId || !eventTitle) return;

        setCreating(true);
        setCreateError(null);

        const preset = DESIGN_PRESETS[parseInt(selectedPreset)];

        try {
            const response = await fetch("/api/canva/designs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: eventId,
                    title: `Invitation - ${eventTitle}`,
                    width: preset.width,
                    height: preset.height,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.needsAuth) {
                    toast.error("Canva Connection Required", { description: "Please reconnect Canva from the Apps Hub." });
                    return;
                }
                throw new Error(data.error || "Failed to create design");
            }

            // Add the new design to the list
            addDesign(data.design);

            // Open Canva editor in a new tab
            if (data.edit_url) {
                window.open(data.edit_url, "_blank");
            }

            toast.success("Design Created", { description: "Canva has opened in a new tab. Design and save your invitation there." });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create design";
            setCreateError(message);
            toast.error(message);
        } finally {
            setCreating(false);
        }
    };

    const handleEditDesign = (design: EventDesign) => {
        if (design.canva_edit_url) {
            window.open(design.canva_edit_url, "_blank");
        }
    };

    const handleExportDesign = async (design: EventDesign) => {
        startExport(design.id);

        try {
            // Start export job
            const exportResponse = await fetch(
                `/api/canva/designs/${design.id}/export`,
                { method: "POST" }
            );

            const exportData = await exportResponse.json();

            if (!exportResponse.ok) {
                throw new Error(exportData.error || "Failed to start export");
            }

            // Poll for export completion
            const jobId = exportData.job_id;
            let attempts = 0;
            const maxAttempts = 30;

            const pollExport = async () => {
                attempts++;

                const statusResponse = await fetch(`/api/canva/exports/${jobId}`);
                const statusData = await statusResponse.json();

                if (statusData.status === "success" && statusData.download_url) {
                    // Save to Supabase Storage
                    const saveResponse = await fetch(
                        `/api/canva/designs/${design.id}/save`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ download_url: statusData.download_url }),
                        }
                    );

                    const saveData = await saveResponse.json();

                    if (!saveResponse.ok) {
                        throw new Error(saveData.error || "Failed to save image");
                    }

                    completeExport(design.id, saveData.public_url, saveData.design.storage_path);
                    toast.success("Export Complete", { description: "Your invitation has been exported and saved." });
                } else if (statusData.status === "failed") {
                    throw new Error(statusData.error || "Export failed");
                } else if (attempts < maxAttempts) {
                    // Still in progress, poll again
                    setTimeout(pollExport, 2000);
                } else {
                    throw new Error("Export timed out");
                }
            };

            await pollExport();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Export failed";
            failExport(message);
            toast.error("Export Failed", { description: message });
        }
    };

    const handleClose = () => {
        clearExportState();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Design Invitation</DialogTitle>
                    <DialogDescription>
                        Create and export invitation designs for {eventTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4">
                    {/* Event Reference Panel */}
                    {eventData && (
                        <EventReferencePanel
                            title={eventTitle || ""}
                            date={eventData.date}
                            time={eventData.time}
                            location={eventData.location}
                            description={eventData.description}
                        />
                    )}

                    {/* Create New Design */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium">Create New Design</h3>
                        <div className="flex gap-3">
                            <Select
                                value={selectedPreset}
                                onValueChange={setSelectedPreset}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DESIGN_PRESETS.map((preset, index) => (
                                        <SelectItem key={index} value={index.toString()}>
                                            {preset.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleCreateDesign}
                                disabled={isCreating || !eventId}
                                className="gap-2"
                            >
                                {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                Create in Canva
                                <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                        </div>
                        {createError && (
                            <p className="text-sm text-destructive">{createError}</p>
                        )}
                    </div>

                    {/* Export Progress */}
                    {exportingDesignId && <ExportProgress />}

                    {/* Existing Designs */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium">Your Designs</h3>
                        <EventDesignsList
                            designs={designs}
                            isLoading={isLoadingDesigns}
                            onEdit={handleEditDesign}
                            onExport={handleExportDesign}
                            exportingDesignId={exportingDesignId}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
