"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormRichTextEditor } from "@/components/ui/form-rich-text-editor";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
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
import { Megaphone, Trash2, Play, Square, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import type { Announcement } from "./announcements-table";

interface AnnouncementDrawerProps {
    announcement: Announcement | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (id: string) => Promise<void>;
}

export function AnnouncementDrawer({ announcement, open, onOpenChange, onDelete }: AnnouncementDrawerProps) {
    const router = useRouter();
    const sectionHeaderClass =
        "text-drawer-section font-semibold tracking-[0.02em] text-foreground/60";
    const propertyLabelClass =
        "text-drawer-label font-medium leading-none text-muted-foreground";
    const propertyValueClass =
        "text-drawer-value font-medium leading-none tracking-normal";
    const metaTextClass = "text-drawer-meta";
    const inputClass =
        "h-8 bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30";
    const selectTriggerClass =
        "h-8 bg-control border-control focus:ring-0 focus:border-foreground/30";
    const selectContentClass =
        "rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg";
    const selectItemClass =
        "rounded-md px-2.5 py-1.5 text-drawer-menu-item font-medium leading-none tracking-normal focus:bg-[hsl(var(--menu-hover))] focus:text-[hsl(var(--menu-text))]";
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // ANNOUNCEMENT section
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [deadline, setDeadline] = useState("");

    // DETAILS section (editable)
    const [status, setStatus] = useState("draft");
    const [priority, setPriority] = useState("medium");
    const [displayStart, setDisplayStart] = useState("");
    const [displayUntil, setDisplayUntil] = useState("");

    useEffect(() => {
        if (announcement) {
            setTitle(announcement.title);
            setContent(announcement.content ?? "");
            setDeadline(announcement.deadline ?? "");
            setStatus(announcement.status);
            setPriority(announcement.priority);
            setDisplayStart(announcement.display_start?.split("T")[0] ?? "");
            setDisplayUntil(announcement.display_until?.split("T")[0] ?? "");
        }
    }, [announcement]);

    const creatorName = announcement?.creator?.full_name;

    const handleSave = async () => {
        if (!announcement || !title.trim()) return;
        setIsSaving(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("announcements") as any)
            .update({
                title: title.trim(),
                content: content.trim() || null,
                deadline: deadline || null,
                status,
                priority,
                display_start: displayStart || null,
                display_until: displayUntil || null,
            })
            .eq("id", announcement.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Announcement updated.");
            router.refresh();
        }
        setIsSaving(false);
    };

    const handleSetStatus = async (newStatus: "active" | "stopped") => {
        if (!announcement) return;
        setIsUpdatingStatus(true);
        setStatus(newStatus);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("announcements") as any)
            .update({ status: newStatus })
            .eq("id", announcement.id);

        if (error) {
            toast.error(error.message);
            setStatus(announcement.status);
        } else {
            toast.success(newStatus === "active" ? "Announcement activated!" : "Announcement stopped.");
            router.refresh();
        }
        setIsUpdatingStatus(false);
    };

    const handleDelete = async () => {
        if (!announcement) return;
        setIsDeleting(true);
        await onDelete(announcement.id);
        setIsDeleting(false);
        setShowDeleteDialog(false);
        onOpenChange(false);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-sm flex flex-col gap-0 p-0 overflow-hidden bg-background/95 backdrop-blur">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-12 shrink-0 border-b border-border/40">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-muted-foreground stroke-[1.6]" />
                            <SheetTitle className="text-drawer-title font-semibold">Announcement Details</SheetTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="h-3.5 w-3.5 stroke-[1.6]" />
                        </Button>
                    </div>
                    <SheetDescription className="sr-only">
                        Announcement details for {announcement?.title}
                    </SheetDescription>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* ANNOUNCEMENT section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className={sectionHeaderClass}>Announcement</p>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`${inputClass} ${propertyValueClass} placeholder:text-[length:var(--drawer-text-value)] placeholder:font-normal`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Content</label>
                                <FormRichTextEditor
                                    value={content}
                                    onChange={setContent}
                                    placeholder="Announcement content..."
                                    minHeight="6rem"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Deadline</label>
                                <Input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className={`${inputClass} ${propertyValueClass}`}
                                />
                            </div>
                        </div>

                        <Separator className="bg-border/40" />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className={sectionHeaderClass}>Details</p>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className={`${selectTriggerClass} ${propertyValueClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="draft" className={selectItemClass}>Draft</SelectItem>
                                        <SelectItem value="active" className={selectItemClass}>Active</SelectItem>
                                        <SelectItem value="stopped" className={selectItemClass}>Stopped</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Priority</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className={`${selectTriggerClass} ${propertyValueClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="low" className={selectItemClass}>Low</SelectItem>
                                        <SelectItem value="medium" className={selectItemClass}>Medium</SelectItem>
                                        <SelectItem value="high" className={selectItemClass}>High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Display Start</label>
                                <Input
                                    type="date"
                                    value={displayStart}
                                    onChange={(e) => setDisplayStart(e.target.value)}
                                    className={`${inputClass} ${propertyValueClass}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Display Until</label>
                                <Input
                                    type="date"
                                    value={displayUntil}
                                    onChange={(e) => setDisplayUntil(e.target.value)}
                                    className={`${inputClass} ${propertyValueClass}`}
                                />
                            </div>
                            {announcement && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className={`${metaTextClass} text-muted-foreground shrink-0`}>Created at</span>
                                    <span className={`${metaTextClass} text-right`}>
                                        {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                            )}
                            {creatorName && (
                                <div className="flex items-center justify-between">
                                    <span className={`${metaTextClass} text-muted-foreground`}>Created by</span>
                                    <span className={metaTextClass}>{creatorName}</span>
                                </div>
                            )}
                        </div>

                        <Separator className="bg-border/40" />

                        {/* QUICK ACTIONS section */}
                        <div className="px-5 py-4 space-y-2">
                            <p className={sectionHeaderClass}>Quick actions</p>
                            {status === "draft" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-8 text-xs font-normal border-border/60 hover:bg-control-hover"
                                    onClick={() => handleSetStatus("active")}
                                    disabled={isUpdatingStatus}
                                >
                                    <Play className="h-3.5 w-3.5 text-green-600 stroke-[1.6]" />
                                    {isUpdatingStatus ? "Activating..." : "Activate"}
                                </Button>
                            )}
                            {status === "active" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-8 text-xs font-normal border-border/60 hover:bg-control-hover"
                                    onClick={() => handleSetStatus("stopped")}
                                    disabled={isUpdatingStatus}
                                >
                                    <Square className="h-3.5 w-3.5 text-orange-500 stroke-[1.6]" />
                                    {isUpdatingStatus ? "Stopping..." : "Stop"}
                                </Button>
                            )}
                            {status === "stopped" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-8 text-xs font-normal border-border/60 hover:bg-control-hover"
                                    onClick={() => handleSetStatus("active")}
                                    disabled={isUpdatingStatus}
                                >
                                    <RotateCcw className="h-3.5 w-3.5 text-blue-600 stroke-[1.6]" />
                                    {isUpdatingStatus ? "Reactivating..." : "Reactivate"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <Separator className="bg-border/40" />
                    <div className="px-5 py-4 shrink-0">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !title.trim()}
                            className="w-full h-9 rounded-full text-[12px] font-semibold"
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{announcement?.title}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
