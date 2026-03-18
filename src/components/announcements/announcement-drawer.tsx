"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    }, [announcement?.id]);

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
                <SheetContent className="w-full sm:max-w-sm flex flex-col gap-0 p-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-12 shrink-0">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-muted-foreground" />
                            <SheetTitle className="text-sm font-semibold">Announcement Details</SheetTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <SheetDescription className="sr-only">
                        Announcement details for {announcement?.title}
                    </SheetDescription>

                    <Separator />

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* ANNOUNCEMENT section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Announcement
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Content</label>
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Announcement content..."
                                    className="text-sm resize-none"
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Deadline</label>
                                <Input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Details
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="stopped">Stopped</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Priority</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Display Start</label>
                                <Input
                                    type="date"
                                    value={displayStart}
                                    onChange={(e) => setDisplayStart(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Display Until</label>
                                <Input
                                    type="date"
                                    value={displayUntil}
                                    onChange={(e) => setDisplayUntil(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            {announcement && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-xs text-muted-foreground shrink-0">Created at</span>
                                    <span className="text-xs text-right">
                                        {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                            )}
                            {creatorName && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Created by</span>
                                    <span className="text-xs">{creatorName}</span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* QUICK ACTIONS section */}
                        <div className="px-5 py-4 space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Quick Actions
                            </p>
                            {status === "draft" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-8 text-xs font-normal"
                                    onClick={() => handleSetStatus("active")}
                                    disabled={isUpdatingStatus}
                                >
                                    <Play className="h-3.5 w-3.5 text-green-600" />
                                    {isUpdatingStatus ? "Activating..." : "Activate"}
                                </Button>
                            )}
                            {status === "active" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-8 text-xs font-normal"
                                    onClick={() => handleSetStatus("stopped")}
                                    disabled={isUpdatingStatus}
                                >
                                    <Square className="h-3.5 w-3.5 text-orange-500" />
                                    {isUpdatingStatus ? "Stopping..." : "Stop"}
                                </Button>
                            )}
                            {status === "stopped" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-8 text-xs font-normal"
                                    onClick={() => handleSetStatus("active")}
                                    disabled={isUpdatingStatus}
                                >
                                    <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                                    {isUpdatingStatus ? "Reactivating..." : "Reactivate"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <Separator />
                    <div className="px-5 py-4 shrink-0">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !title.trim()}
                            className="w-full h-8 text-xs"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
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
