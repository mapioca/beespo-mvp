"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Share2, ChevronDown, Download, Link, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface BuilderTopBarProps {
    /** Current meeting title from form */
    title: string;
    /** Whether we are editing an existing meeting (truthy = update mode) */
    initialMeetingId?: string;
    /** Whether the save/create action is in progress */
    isCreating: boolean;
    /** Whether required fields are filled (used to enable/disable buttons) */
    isValid: boolean;
    /** Markdown content of the current agenda (for download) */
    markdownForDownload: () => string;
    /** Trigger validation + save flow */
    onSave: () => void;
    /** Open the preview modal */
    onPreview: () => void;
    /** Duplicate the meeting with a new name */
    onSaveAsNew: (newTitle: string) => Promise<void>;
}

export function BuilderTopBar({
    title,
    initialMeetingId,
    isCreating,
    isValid,
    markdownForDownload,
    onSave,
    onPreview,
    onSaveAsNew,
}: BuilderTopBarProps) {
    const router = useRouter();
    const [shareOpen, setShareOpen] = useState(false);
    const [saveAsNewOpen, setSaveAsNewOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSavingAsNew, setIsSavingAsNew] = useState(false);

    // ─── Share actions ─────────────────────────────────────────
    const handleCopyLink = async () => {
        const url = initialMeetingId
            ? `${window.location.origin}/meetings/${initialMeetingId}`
            : window.location.href;
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
        setShareOpen(false);
    };

    const handleDownload = () => {
        const md = markdownForDownload();
        if (!md.trim()) {
            toast.error("No agenda content to download");
            return;
        }
        const blob = new Blob([md], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "agenda").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        setShareOpen(false);
    };

    // ─── Save as New Meeting ───────────────────────────────────
    const openSaveAsNew = () => {
        setNewTitle(title ? `${title} (Copy)` : "");
        setSaveAsNewOpen(true);
    };

    const handleSaveAsNew = async () => {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        if (trimmed.toLowerCase() === title.trim().toLowerCase()) {
            toast.error("New meeting must have a different name");
            return;
        }
        setIsSavingAsNew(true);
        try {
            await onSaveAsNew(trimmed);
            setSaveAsNewOpen(false);
        } catch {
            // errors are toasted inside onSaveAsNew
        } finally {
            setIsSavingAsNew(false);
        }
    };

    const saveLabel = isCreating
        ? "Saving..."
        : initialMeetingId
            ? "Save Changes"
            : "Create Agenda";

    return (
        <>
            {/* Top Bar */}
            <div className="h-14 flex items-center gap-3 px-4 border-b bg-background shrink-0 z-20">
                {/* Left — back */}
                <button
                    type="button"
                    onClick={() => router.push("/meetings")}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="h-4 w-px bg-border/60" />

                {/* Title badge */}
                <span className="text-sm font-medium truncate max-w-[240px] text-foreground/80">
                    {title || "Untitled Agenda"}
                </span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right — actions */}
                <div className="flex items-center gap-2">
                    {/* Preview */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={onPreview}
                        disabled={!isValid}
                        title="Preview agenda"
                    >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">Preview</span>
                    </Button>

                    {/* Share popover */}
                    <Popover open={shareOpen} onOpenChange={setShareOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 border-border/60 text-xs"
                            >
                                <Share2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Share</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-52 p-1.5">
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                            >
                                <Link className="h-3.5 w-3.5 text-muted-foreground" />
                                Copy link
                            </button>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                            >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                Download (.md)
                            </button>
                        </PopoverContent>
                    </Popover>

                    {/* Save split button */}
                    <div className="flex items-center">
                        <Button
                            type="button"
                            size="sm"
                            className={cn(
                                "h-8 text-xs font-medium rounded-r-none border-r-0",
                                "bg-zinc-900 text-white hover:bg-zinc-800"
                            )}
                            onClick={onSave}
                            disabled={isCreating || !isValid}
                        >
                            {isCreating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            {saveLabel}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    size="sm"
                                    className={cn(
                                        "h-8 w-8 rounded-l-none px-0",
                                        "bg-zinc-900 text-white hover:bg-zinc-700",
                                        "border-l border-white/20"
                                    )}
                                    disabled={isCreating}
                                >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onSelect={openSaveAsNew}>
                                    Save as New Meeting
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Save as New Meeting — dialog */}
            <Dialog open={saveAsNewOpen} onOpenChange={(o) => !isSavingAsNew && setSaveAsNewOpen(o)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Save as New Meeting</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will create a full copy of this agenda with a new name. The new meeting must have a different name.
                    </p>
                    <div className="space-y-1.5 mt-1">
                        <Label htmlFor="new-meeting-title">Meeting Name</Label>
                        <Input
                            id="new-meeting-title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Enter a new name..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveAsNew();
                            }}
                            autoFocus
                        />
                        {newTitle.trim().toLowerCase() === title.trim().toLowerCase() && newTitle.trim() && (
                            <p className="text-xs text-destructive">Must be different from the current name.</p>
                        )}
                    </div>
                    <DialogFooter className="mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSaveAsNewOpen(false)}
                            disabled={isSavingAsNew}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveAsNew}
                            disabled={
                                isSavingAsNew ||
                                !newTitle.trim() ||
                                newTitle.trim().toLowerCase() === title.trim().toLowerCase()
                            }
                        >
                            {isSavingAsNew && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Create Copy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
