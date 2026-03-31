"use client";

import { useState } from "react";
import {
    ArrowLeftRight,
    ChevronDown,
    Link,
    Loader2,
    FileText,
    FileCode,
    FileType,
    CalendarDays,
    ClipboardList,
    MoreHorizontal,
    Monitor,
    Save,
    Smartphone,
    Tablet,
    Trash2,
} from "lucide-react";
import { ZoomIcon } from "@/components/ui/zoom-icon";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
    downloadBlob,
} from "@/lib/agenda-export-utils";
import { BuilderMode } from "./types";

interface MeetingContextBarProps {
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
    /** Total agenda items */
    itemCount: number;
    /** Current preview device for program mode */
    programPreviewDevice: "phone" | "tablet" | "desktop";
    /** Update the preview device in program mode */
    onProgramPreviewDeviceChange: (device: "phone" | "tablet" | "desktop") => void;
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
    /** Whether the meeting is live */
    isLive?: boolean;
}

export function MeetingContextBar({
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
    itemCount,
    programPreviewDevice,
    onProgramPreviewDeviceChange,
    workspaceSlug,
    zoomJoinUrl,
    isZoomConnected,
    isCreatingZoom,
    onOpenZoomSheet,
    onAddZoom,
    onDelete,
}: MeetingContextBarProps) {
    const [saveAsNewOpen, setSaveAsNewOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSavingAsNew, setIsSavingAsNew] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);

    const handleCopyLink = async () => {
        const url = initialMeetingId
            ? `${window.location.origin}/meetings/${initialMeetingId}`
            : window.location.href;
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleCopyProgramLink = async () => {
        if (!initialMeetingId || !workspaceSlug) {
            toast.error("Program link unavailable", {
                description: "Save the agenda and reload to generate the program link.",
            });
            return;
        }
        const url = `${window.location.origin}/${workspaceSlug}/program/${initialMeetingId}`;
        await navigator.clipboard.writeText(url);
        toast.success("Program link copied");
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
        } catch (error) {
            console.error(`Export to ${format} failed:`, error);
            toast.error(`Failed to generate ${format.toUpperCase()}`);
        } finally {
            setExportingFormat(null);
        }
    };

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

    const saveLabel = isCreating
        ? "Saving..."
        : initialMeetingId
            ? "Save"
            : "Create Agenda";

    const deviceOptions = {
        phone: { label: "Phone", icon: Smartphone },
        tablet: { label: "Tablet", icon: Tablet },
        desktop: { label: "Desktop", icon: Monitor },
    } as const;
    const CurrentDeviceIcon = deviceOptions[programPreviewDevice].icon;

    return (
        <>
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-4 w-4 stroke-[1.6]" /> },
                    { label: "Agendas", href: "/meetings/agendas", icon: <ClipboardList className="h-4 w-4 stroke-[1.6]" /> },
                    { label: title || "Untitled Agenda", icon: <FileText className="h-4 w-4 stroke-[1.6]" /> },
                ]}
                className="bg-chrome backdrop-blur ring-0 border-b-0 rounded-none px-5 py-2"
                inlineAction={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                title="More options"
                                className={cn(
                                    "inline-flex items-center justify-center h-6 w-6 rounded",
                                    "text-muted-foreground hover:text-foreground hover:bg-accent",
                                    "data-[state=open]:bg-accent data-[state=open]:text-foreground",
                                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                )}
                            >
                                <MoreHorizontal className="h-4 w-4 stroke-[2.2]" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60 rounded-xl border-border/60 shadow-lg">
                            <DropdownMenuItem onSelect={() => void handleCopyLink()}>
                                <Link className="h-4 w-4 stroke-[1.6]" />
                                Copy public link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => void handleCopyProgramLink()}
                                disabled={!workspaceSlug || !initialMeetingId}
                            >
                                <Link className="h-4 w-4 stroke-[1.6]" />
                                Copy program link
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                disabled={!!exportingFormat}
                                onSelect={() => void handleExport("pdf")}
                            >
                                <FileText className="h-4 w-4 stroke-[1.6]" />
                                <span className="flex-1">PDF Document (.pdf)</span>
                                {exportingFormat === "pdf" && (
                                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!!exportingFormat}
                                onSelect={() => void handleExport("docx")}
                            >
                                <FileType className="h-4 w-4 stroke-[1.6]" />
                                <span className="flex-1">Word Document (.docx)</span>
                                {exportingFormat === "docx" && (
                                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!!exportingFormat}
                                onSelect={() => void handleExport("md")}
                            >
                                <FileCode className="h-4 w-4 stroke-[1.6]" />
                                <span className="flex-1">Markdown (.md)</span>
                                {exportingFormat === "md" && (
                                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!!exportingFormat}
                                onSelect={() => void handleExport("txt")}
                            >
                                <FileText className="h-4 w-4 stroke-[1.6]" />
                                <span className="flex-1">Plain Text (.txt)</span>
                                {exportingFormat === "txt" && (
                                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                                )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {isLeader && initialMeetingId ? (
                                zoomJoinUrl ? (
                                    <DropdownMenuItem onSelect={onOpenZoomSheet}>
                                        <ZoomIcon className="h-4 w-4" />
                                        Open Zoom
                                    </DropdownMenuItem>
                                ) : isZoomConnected ? (
                                    <DropdownMenuItem
                                        onSelect={onAddZoom}
                                        disabled={isCreatingZoom}
                                    >
                                        {isCreatingZoom ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <ZoomIcon className="h-4 w-4" />
                                        )}
                                        Add Zoom meeting
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem disabled>
                                        <ZoomIcon className="h-4 w-4" />
                                        Connect Zoom in Settings
                                    </DropdownMenuItem>
                                )
                            ) : (
                                <DropdownMenuItem disabled>
                                    <ZoomIcon className="h-4 w-4" />
                                    Zoom unavailable
                                </DropdownMenuItem>
                            )}

                            {isLeader && initialMeetingId && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onSelect={() => setIsDeleteDialogOpen(true)}
                                        className="focus:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 stroke-[1.6]" />
                                        Delete agenda
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
                action={
                    <div className="flex items-center gap-2.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    title="Switch mode"
                                    className={cn(
                                        "inline-flex items-center gap-2 h-8 px-3.5 rounded-full",
                                        "bg-background text-foreground hover:bg-accent",
                                        "border border-border/80",
                                        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    )}
                                >
                                    <ArrowLeftRight className="h-4 w-4 stroke-[1.6]" />
                                    <span className="text-[12px]">Switch mode</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onSelect={() => onModeChange("planning")} className={cn(mode === "planning" && "font-medium")}>
                                    Planning
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onModeChange("print-preview")} className={cn(mode === "print-preview" && "font-medium")}>
                                    Print Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onModeChange("program")} className={cn(mode === "program" && "font-medium")}>
                                    Program
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {mode === "program" && (
                            <DropdownMenu open={deviceMenuOpen} onOpenChange={setDeviceMenuOpen}>
                                <div className="inline-flex items-center h-8 border border-border/80 bg-background text-foreground rounded-full">
                                    <button
                                        type="button"
                                        onClick={() => setDeviceMenuOpen(true)}
                                        title="Preview device"
                                        className={cn(
                                            "inline-flex items-center gap-2 h-8 pl-3.5 pr-2 rounded-l-full rounded-r-none",
                                            "hover:bg-accent",
                                            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        )}
                                    >
                                        <CurrentDeviceIcon className="h-4 w-4 stroke-[1.6]" />
                                        <span className="text-[12px]">{deviceOptions[programPreviewDevice].label}</span>
                                    </button>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            title="Device options"
                                            className={cn(
                                                "inline-flex items-center justify-center h-8 w-9 rounded-r-full rounded-l-none",
                                                "hover:bg-accent",
                                                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                "data-[state=open]:bg-accent data-[state=open]:text-foreground"
                                            )}
                                        >
                                            <ChevronDown className="h-4 w-4 stroke-[1.6]" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </div>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem
                                        onSelect={() => onProgramPreviewDeviceChange("phone")}
                                        className={cn(programPreviewDevice === "phone" && "font-medium")}
                                    >
                                        <Smartphone className="h-4 w-4 stroke-[1.6]" />
                                        Phone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => onProgramPreviewDeviceChange("tablet")}
                                        className={cn(programPreviewDevice === "tablet" && "font-medium")}
                                    >
                                        <Tablet className="h-4 w-4 stroke-[1.6]" />
                                        Tablet
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => onProgramPreviewDeviceChange("desktop")}
                                        className={cn(programPreviewDevice === "desktop" && "font-medium")}
                                    >
                                        <Monitor className="h-4 w-4 stroke-[1.6]" />
                                        Desktop
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {isLeader && (
                            <div className="inline-flex items-center h-8 rounded-full">
                                <button
                                    type="button"
                                    onClick={onSave}
                                    disabled={isCreating || !isValid}
                                    title="Save"
                                    className={cn(
                                        "inline-flex items-center gap-2 h-8 pl-3.5 pr-2 rounded-l-full rounded-r-none",
                                        "bg-foreground text-background hover:bg-foreground/90",
                                        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        "disabled:pointer-events-none disabled:opacity-60"
                                    )}
                                >
                                    <Save className="h-4 w-4 stroke-[1.6]" />
                                    <span className="text-[12px]">Save</span>
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            title="Save options"
                                            className={cn(
                                                "inline-flex items-center justify-center h-8 w-9 rounded-r-full rounded-l-none border border-l-0 border-foreground/20 bg-foreground text-background",
                                                "hover:bg-foreground/90",
                                                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                "data-[state=open]:bg-foreground/90"
                                            )}
                                        >
                                            <ChevronDown className="h-4 w-4 stroke-[1.6]" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem onSelect={onSave} disabled={isCreating || !isValid}>
                                            {isCreating && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                                            {saveLabel}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={onSaveAsTemplate}>
                                            Save as Template
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={openSaveAsNew}>
                                            Save as New Meeting
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        <div className="h-4 w-px bg-border/60" />
                        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                            {itemCount} {itemCount === 1 ? "item" : "items"} &bull; {totalDuration} min
                        </span>
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
