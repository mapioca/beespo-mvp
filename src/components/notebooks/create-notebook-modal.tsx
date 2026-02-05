"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NOTEBOOK_COVERS, getCoverById, type NotebookCover } from "@/lib/notebooks/notebook-covers";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CreateNotebookModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateNotebook: (title: string, coverStyle: string) => Promise<void>;
}

export function CreateNotebookModal({
    open,
    onOpenChange,
    onCreateNotebook,
}: CreateNotebookModalProps) {
    const [title, setTitle] = useState("");
    const [selectedCover, setSelectedCover] = useState<string>(NOTEBOOK_COVERS[0].id);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    const cover = getCoverById(selectedCover);

    const handleCreate = async () => {
        if (!title.trim()) {
            setError("Please enter a title");
            return;
        }

        setIsCreating(true);
        setError("");

        try {
            await onCreateNotebook(title.trim(), selectedCover);
            // Reset form
            setTitle("");
            setSelectedCover(NOTEBOOK_COVERS[0].id);
            onOpenChange(false);
        } catch {
            setError("Failed to create notebook. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setTitle("");
        setSelectedCover(NOTEBOOK_COVERS[0].id);
        setError("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create New Notebook</DialogTitle>
                    <DialogDescription>
                        Give your notebook a name and choose a cover design.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Live Preview + Title Input */}
                    <div className="flex gap-6">
                        {/* Mini Preview */}
                        <div className="flex-shrink-0">
                            <Label className="text-xs text-muted-foreground mb-2 block">
                                Preview
                            </Label>
                            <div
                                className="w-24 rounded-lg shadow-md overflow-hidden"
                                style={{ aspectRatio: "3/4" }}
                            >
                                <div
                                    className="w-full h-full relative"
                                    style={{ background: cover.gradient }}
                                >
                                    {/* Spine */}
                                    <div className="absolute inset-y-0 left-0 w-2 bg-black/20" />
                                    {/* Title */}
                                    <div className="absolute inset-x-0 bottom-0 p-2">
                                        <div
                                            className={cn(
                                                "backdrop-blur-sm rounded px-2 py-1 text-xs font-medium truncate",
                                                cover.textColor === "light"
                                                    ? "bg-black/30 text-white"
                                                    : "bg-white/70 text-gray-900"
                                            )}
                                        >
                                            {title || "Untitled"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="title">Notebook Title</Label>
                            <Input
                                id="title"
                                placeholder="Enter notebook title..."
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setError("");
                                }}
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                        </div>
                    </div>

                    {/* Cover Picker */}
                    <div className="space-y-2">
                        <Label>Choose a Cover</Label>
                        <div className="grid grid-cols-7 gap-2">
                            {NOTEBOOK_COVERS.map((coverOption) => (
                                <CoverOption
                                    key={coverOption.id}
                                    cover={coverOption}
                                    isSelected={selectedCover === coverOption.id}
                                    onSelect={() => setSelectedCover(coverOption.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create Notebook"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface CoverOptionProps {
    cover: NotebookCover;
    isSelected: boolean;
    onSelect: () => void;
}

function CoverOption({ cover, isSelected, onSelect }: CoverOptionProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "relative rounded-md overflow-hidden transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isSelected
                    ? "ring-2 ring-primary ring-offset-2 scale-105"
                    : "hover:scale-105"
            )}
            style={{ aspectRatio: "3/4" }}
            title={cover.name}
        >
            <div
                className="absolute inset-0"
                style={{ background: cover.gradient }}
            />
            {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="w-4 h-4 text-white" />
                </div>
            )}
        </button>
    );
}
