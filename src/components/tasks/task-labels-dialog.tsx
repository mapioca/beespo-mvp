"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getWorkspaceLabels,
    getTaskLabels,
    assignLabels,
    createLabel,
    deleteLabel,
} from "@/lib/actions/task-actions";
import { useToast } from "@/lib/hooks/use-toast";

interface TaskLabelsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    taskTitle: string;
}

interface Label {
    id: string;
    name: string;
    color: string;
}

const PRESET_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#eab308", // yellow
    "#84cc16", // lime
    "#22c55e", // green
    "#10b981", // emerald
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#0ea5e9", // sky
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#a855f7", // purple
    "#d946ef", // fuchsia
    "#ec4899", // pink
];

export function TaskLabelsDialog({
    open,
    onOpenChange,
    taskId,
    taskTitle,
}: TaskLabelsDialogProps) {
    const [workspaceLabels, setWorkspaceLabels] = useState<Label[]>([]);
    const [assignedLabelIds, setAssignedLabelIds] = useState<Set<string>>(new Set());
    const [isCreating, setIsCreating] = useState(false);
    const [newLabelName, setNewLabelName] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const loadLabels = useCallback(async () => {
        setIsLoading(true);
        try {
            const [labelsResult, taskLabelsResult] = await Promise.all([
                getWorkspaceLabels(),
                getTaskLabels(taskId),
            ]);

            if (labelsResult.success && labelsResult.labels) {
                setWorkspaceLabels(labelsResult.labels as Label[]);
            }

            if (taskLabelsResult.success && taskLabelsResult.labels) {
                setAssignedLabelIds(new Set((taskLabelsResult.labels as Label[]).map((l) => l.id)));
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load labels", variant: "destructive" });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [taskId, toast]);

    useEffect(() => {
        if (open) {
            loadLabels();
        }
    }, [open, loadLabels]);

    const toggleLabel = async (labelId: string) => {
        const newAssignedIds = new Set(assignedLabelIds);
        if (newAssignedIds.has(labelId)) {
            newAssignedIds.delete(labelId);
        } else {
            newAssignedIds.add(labelId);
        }

        setAssignedLabelIds(newAssignedIds);

        const result = await assignLabels(taskId, Array.from(newAssignedIds));
        if (!result.success) {
            // Revert on error
            setAssignedLabelIds(assignedLabelIds);
            toast({ title: "Error", description: result.error || "Failed to update labels", variant: "destructive" });
        }
    };

    const handleCreateLabel = async () => {
        if (!newLabelName.trim()) {
            toast({ title: "Error", description: "Label name is required", variant: "destructive" });
            return;
        }

        const result = await createLabel(newLabelName.trim(), selectedColor);
        if (result.success && result.label) {
            setWorkspaceLabels([...workspaceLabels, result.label]);
            setNewLabelName("");
            setSelectedColor(PRESET_COLORS[0]);
            setIsCreating(false);
            toast({ title: "Label created" });
        } else {
            toast({ title: "Error", description: result.error || "Failed to create label", variant: "destructive" });
        }
    };

    const handleDeleteLabel = async (labelId: string) => {
        const result = await deleteLabel(labelId);
        if (result.success) {
            setWorkspaceLabels(workspaceLabels.filter((l) => l.id !== labelId));
            setAssignedLabelIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(labelId);
                return newSet;
            });
            toast({ title: "Label deleted" });
        } else {
            toast({ title: "Error", description: result.error || "Failed to delete label", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Labels</DialogTitle>
                    <DialogDescription>{taskTitle}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Existing Labels */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Available Labels</Label>
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : workspaceLabels.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No labels yet. Create one below.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {workspaceLabels.map((label) => (
                                    <div
                                        key={label.id}
                                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                                    >
                                        <button
                                            onClick={() => toggleLabel(label.id)}
                                            className="flex items-center gap-2 flex-1"
                                        >
                                            <div
                                                className={cn(
                                                    "h-4 w-4 rounded border flex items-center justify-center",
                                                    assignedLabelIds.has(label.id)
                                                        ? "bg-primary border-primary"
                                                        : "border-input"
                                                )}
                                            >
                                                {assignedLabelIds.has(label.id) && (
                                                    <Check className="h-3 w-3 text-primary-foreground" />
                                                )}
                                            </div>
                                            <Badge
                                                style={{ backgroundColor: label.color }}
                                                className="text-white border-0"
                                            >
                                                {label.name}
                                            </Badge>
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={() => handleDeleteLabel(label.id)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create New Label */}
                    {!isCreating ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreating(true)}
                            className="w-full"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Label
                        </Button>
                    ) : (
                        <div className="space-y-3 p-3 border rounded-md">
                            <div className="space-y-2">
                                <Label htmlFor="label-name">Label Name</Label>
                                <Input
                                    id="label-name"
                                    value={newLabelName}
                                    onChange={(e) => setNewLabelName(e.target.value)}
                                    placeholder="e.g., High Priority"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleCreateLabel();
                                        }
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="grid grid-cols-8 gap-2">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={cn(
                                                "h-8 w-8 rounded border-2 transition-all",
                                                selectedColor === color
                                                    ? "border-foreground scale-110"
                                                    : "border-transparent hover:scale-105"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleCreateLabel} size="sm" className="flex-1">
                                    Create
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewLabelName("");
                                        setSelectedColor(PRESET_COLORS[0]);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
