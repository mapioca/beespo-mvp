"use client";

import { useState } from "react";
import { Eye, Share2, ChevronDown, Link, Loader2, FileText, FileCode, FileType, CalendarDays, ClipboardList } from "lucide-react";
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
    /** Open the save as template flow */
    onSaveAsTemplate: () => void;
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
    onSaveAsTemplate,
}: BuilderTopBarProps) {
    const [shareOpen, setShareOpen] = useState(false);
    const [saveAsNewOpen, setSaveAsNewOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSavingAsNew, setIsSavingAsNew] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<string | null>(null);

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
                action={
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
                                    <DropdownMenuItem onSelect={onSaveAsTemplate}>
                                        Save as Template
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={openSaveAsNew}>
                                        Save as New Meeting
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
        </>
    );
}
