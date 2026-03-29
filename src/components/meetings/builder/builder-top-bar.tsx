"use client";

import { useState, useEffect } from "react";
import { Share2, ChevronDown, Link, Loader2, FileText, FileCode, FileType, CalendarDays, ClipboardList, Clock, Star, MoreHorizontal, Trash2 } from "lucide-react";
import { useFavoritesStore } from "@/stores/favorites-store";
import { ZoomIcon, ZoomLogo } from "@/components/ui/zoom-icon";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
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
import {
    generateMeetingPdf,
    generateMeetingDocx,
    generateMeetingTxt,
    downloadBlob
} from "@/lib/agenda-export-utils";
import { ModeSwitcher } from "./mode-switcher";
import { BuilderMode } from "./types";

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
    /** Duplicate the meeting with a new name */
    onSaveAsNew: (newTitle: string) => Promise<void>;
    /** Open the save as template flow */
    onSaveAsTemplate: () => void;
    /** Current builder mode */
    mode: BuilderMode;
    /** Callback to change the builder mode */
    onModeChange: (mode: BuilderMode) => void;
    /** Whether the current user is a leader/admin */
    isLeader: boolean;
    /** Total agenda duration in minutes */
    totalDuration: number;
    /** Workspace slug for program URL */
    workspaceSlug: string | null;
    /** Zoom join URL (null if no zoom meeting linked) */
    zoomJoinUrl: string | null;
    /** Whether user has Zoom connected via Settings */
    isZoomConnected: boolean;
    /** Whether Zoom meeting creation is in progress */
    isCreatingZoom: boolean;
    /** Open the Zoom meeting management sheet */
    onOpenZoomSheet: () => void;
    /** Trigger the "Add Zoom" flow */
    onAddZoom: () => void;
    /** Delete the meeting — resolves when done */
    onDelete?: () => Promise<void>;
}

export function BuilderTopBar({
    title,
    initialMeetingId,
    isCreating,
    isValid,
    markdownForDownload,
    onSave,
    onSaveAsNew,
    onSaveAsTemplate,
    mode,
    onModeChange,
    isLeader,
    totalDuration,
    zoomJoinUrl,
    isZoomConnected,
    isCreatingZoom,
    onOpenZoomSheet,
    onAddZoom,
    onDelete,
}: BuilderTopBarProps) {
    const [shareOpen, setShareOpen] = useState(false);
    const [saveAsNewOpen, setSaveAsNewOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSavingAsNew, setIsSavingAsNew] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Star / Favorite
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const favorited = mounted && initialMeetingId ? isFavorite(initialMeetingId, "meeting") : false;

    const handleToggleFavorite = () => {
        if (!initialMeetingId) return;
        toggleFavorite({
            id: initialMeetingId,
            type: "meeting",
            title,
            href: `/meetings/${initialMeetingId}`,
        });
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    // ─── Share actions ─────────────────────────────────────────
    const handleCopyLink = async () => {
        const url = initialMeetingId
            ? `${window.location.origin}/meetings/${initialMeetingId}`
            : window.location.href;
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
        setShareOpen(false);
    };

    const handleExport = async (format: "pdf" | "docx" | "md" | "txt") => {
        const md = markdownForDownload();
        if (!md.trim()) {
            toast.error("No agenda content to download");
            return;
        }

        const safeTitle = (title || "agenda").replace(/[^a-z0-9]/gi, "_").toLowerCase();
        setExportingFormat(format);

        try {
            switch (format) {
                case "pdf":
                    await generateMeetingPdf(md, safeTitle);
                    break;
                case "docx":
                    await generateMeetingDocx(md, safeTitle);
                    break;
                case "md": {
                    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
                    downloadBlob(blob, `${safeTitle}.md`);
                    break;
                }
                case "txt":
                    await generateMeetingTxt(md, safeTitle);
                    break;
            }
            toast.success(`${format.toUpperCase()} downloaded successfully`);
            setShareOpen(false);
        } catch (error) {
            console.error(`Export to ${format} failed:`, error);
            toast.error(`Failed to generate ${format.toUpperCase()}`);
        } finally {
            setExportingFormat(null);
        }
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
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                    { label: "Agendas", href: "/meetings/agendas", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                    { label: title || "Untitled Agenda", icon: <FileText className="h-3.5 w-3.5" /> },
                ]}
                inlineAction={initialMeetingId ? (
                    <>
                        {/* Star / Favorite */}
                        <button
                            type="button"
                            title={favorited ? "Remove from favorites" : "Add to favorites"}
                            onClick={handleToggleFavorite}
                            className={cn(
                                "inline-flex items-center justify-center h-6 w-6 rounded",
                                "text-muted-foreground hover:text-foreground hover:bg-accent",
                                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            )}
                        >
                            <Star
                                className={cn(
                                    "h-3.5 w-3.5 transition-colors",
                                    favorited ? "fill-amber-400 text-amber-400" : ""
                                )}
                            />
                        </button>

                        {/* More options */}
                        {isLeader && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        title="More options"
                                        className={cn(
                                            "inline-flex items-center justify-center h-6 w-6 rounded",
                                            "text-muted-foreground hover:text-foreground hover:bg-accent",
                                            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        )}
                                    >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    <DropdownMenuItem
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete agenda
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </>
                ) : undefined}
                action={
                    <div className="flex items-center gap-2">
                        {/* Duration */}
                        {totalDuration > 0 && (
                            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap mr-1">
                                <Clock className="h-3.5 w-3.5" />
                                ~{totalDuration} min
                            </span>
                        )}

                        {/* Zoom */}
                        {isLeader && initialMeetingId && (
                            zoomJoinUrl ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    title="Zoom Meeting"
                                    className="h-8 gap-1.5 hover:bg-blue-500/10 px-2"
                                    onClick={onOpenZoomSheet}
                                >
                                    <ZoomLogo iconClassName="h-4 w-4" wordmarkClassName="h-3 w-auto" />
                                </Button>
                            ) : isZoomConnected ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    title="Add Zoom Meeting"
                                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
                                    onClick={onAddZoom}
                                    disabled={isCreatingZoom}
                                >
                                    {isCreatingZoom ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <ZoomIcon className="h-3.5 w-3.5" />
                                    )}
                                    <span className="hidden sm:inline">Zoom</span>
                                </Button>
                            ) : null
                        )}

                        {/* Mode Switcher */}
                        <ModeSwitcher mode={mode} onModeChange={onModeChange} isLeader={isLeader} />

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
                            <PopoverContent align="end" className="w-60 p-1.5">
                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Share Link
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                                >
                                    <Link className="h-3.5 w-3.5 text-muted-foreground" />
                                    Copy public link
                                </button>

                                <div className="h-px bg-border/40 my-1.5 mx-1" />

                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Download As
                                </div>
                                <div className="space-y-0.5">
                                    <button
                                        type="button"
                                        disabled={!!exportingFormat}
                                        onClick={() => handleExport("pdf")}
                                        className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <FileText className="h-3.5 w-3.5 text-red-500/80" />
                                            <span>PDF Document (.pdf)</span>
                                        </div>
                                        {exportingFormat === "pdf" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!!exportingFormat}
                                        onClick={() => handleExport("docx")}
                                        className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <FileType className="h-3.5 w-3.5 text-blue-500/80" />
                                            <span>Word Document (.docx)</span>
                                        </div>
                                        {exportingFormat === "docx" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!!exportingFormat}
                                        onClick={() => handleExport("md")}
                                        className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <FileCode className="h-3.5 w-3.5 text-orange-500/80" />
                                            <span>Markdown (.md)</span>
                                        </div>
                                        {exportingFormat === "md" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!!exportingFormat}
                                        onClick={() => handleExport("txt")}
                                        className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <FileText className="h-3.5 w-3.5 text-slate-500/80" />
                                            <span>Plain Text (.txt)</span>
                                        </div>
                                        {exportingFormat === "txt" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Save split button — only for leaders */}
                        {isLeader && <div className="flex items-center">
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
                                    <DropdownMenuItem onSelect={onSaveAsTemplate}>
                                        Save as Template
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={openSaveAsNew}>
                                        Save as New Meeting
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>}
                    </div>
                }
            />

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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Agenda</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{title}&quot;? This action
                            cannot be undone. All agenda items and associated data will be
                            permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
