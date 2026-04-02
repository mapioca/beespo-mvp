"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { Speech, Trash2, Plus, Minus, Calendar, CheckCircle2, Mail } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import type { Speaker } from "./speakers-table";

interface SpeakerDrawerProps {
    speaker: Speaker | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (id: string) => Promise<void>;
}

export function SpeakerDrawer({ speaker, open, onOpenChange, onDelete }: SpeakerDrawerProps) {
    const router = useRouter();
    const sectionHeaderClass =
        "text-drawer-section font-semibold tracking-[0.02em] text-foreground/60";
    const propertyLabelClass =
        "text-drawer-label font-medium leading-none text-muted-foreground";
    const propertyValueClass =
        "text-drawer-value font-medium leading-none tracking-normal";
    const metaTextClass = "text-drawer-meta";
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [name, setName] = useState("");
    const [topic, setTopic] = useState("");
    const [note, setNote] = useState("");
    const [showNote, setShowNote] = useState(false);

    // Sync form fields whenever the selected speaker changes
    useEffect(() => {
        if (speaker) {
            setName(speaker.name);
            setTopic(speaker.topic ?? "");
            setNote("");
            setShowNote(false);
        }
    }, [speaker]);

    const meeting = speaker?.agenda_items?.[0]?.meeting;
    const isConfirmed = speaker?.is_confirmed ?? false;
    const creatorName = speaker?.creator?.full_name;

    const handleSave = async () => {
        if (!speaker || !name.trim() || !topic.trim()) return;
        setIsSaving(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("speakers") as any)
            .update({ name: name.trim(), topic: topic.trim() })
            .eq("id", speaker.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Speaker updated.");
            router.refresh();
        }
        setIsSaving(false);
    };

    const handleToggleConfirmed = async () => {
        if (!speaker) return;
        setIsConfirming(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("speakers") as any)
            .update({ is_confirmed: !isConfirmed })
            .eq("id", speaker.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(!isConfirmed ? "Speaker confirmed!" : "Speaker marked as pending.");
            router.refresh();
        }
        setIsConfirming(false);
    };

    const handleDelete = async () => {
        if (!speaker) return;
        setIsDeleting(true);
        await onDelete(speaker.id);
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
                            <Speech className="h-4 w-4 text-muted-foreground" />
                            <SheetTitle className="text-drawer-title font-semibold">Speaker Details</SheetTitle>
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
                        Speaker details for {speaker?.name}
                    </SheetDescription>

                    <Separator />

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* SPEAKER section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className={sectionHeaderClass}>Speaker</p>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`h-8 bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30 ${propertyValueClass}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Topic</label>
                                <Textarea
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className={`resize-none bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30 ${propertyValueClass}`}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-3">
                            <p className={sectionHeaderClass}>Details</p>
                            <div className="flex items-center justify-between">
                                <span className={`${metaTextClass} text-muted-foreground`}>Status</span>
                                <Badge
                                    variant={isConfirmed ? "default" : "secondary"}
                                    className={metaTextClass}
                                >
                                    {isConfirmed ? "Confirmed" : "Pending"}
                                </Badge>
                            </div>
                            {speaker && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className={`${metaTextClass} text-muted-foreground shrink-0`}>Created</span>
                                    <span className={`${metaTextClass} text-right`}>
                                        {format(new Date(speaker.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                            )}
                            {creatorName && (
                                <div className="flex items-center justify-between">
                                    <span className={`${metaTextClass} text-muted-foreground`}>By</span>
                                    <span className={metaTextClass}>{creatorName}</span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* QUICK ACTIONS section */}
                        <div className="px-5 py-4 space-y-2">
                            <p className={sectionHeaderClass}>Quick actions</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2 h-8 text-xs font-normal border-border/60 hover:bg-control-hover"
                                onClick={handleToggleConfirmed}
                                disabled={isConfirming}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                {isConfirming
                                    ? "Updating..."
                                    : isConfirmed
                                    ? "Mark as Pending"
                                    : "Confirm Speaker"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2 h-8 text-xs font-normal border-border/60 hover:bg-control-hover"
                                onClick={() => toast.info("Invitation letter — coming soon")}
                            >
                                <Mail className="h-3.5 w-3.5 text-blue-600" />
                                Create Invitation Letter
                            </Button>
                        </div>

                        <Separator />

                        {/* NOTES section */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className={sectionHeaderClass}>Notes</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        if (showNote) {
                                            setShowNote(false);
                                            setNote("");
                                        } else {
                                            setShowNote(true);
                                        }
                                    }}
                                >
                                    {showNote ? (
                                        <Minus className="h-3 w-3" />
                                    ) : (
                                        <Plus className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                            {showNote && (
                                <Textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className={`resize-none bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30 ${propertyValueClass} placeholder:text-[length:var(--drawer-text-value)] placeholder:font-normal`}
                                    rows={3}
                                    autoFocus
                                />
                            )}
                        </div>

                        <Separator />

                        {/* RELATED MEETING section */}
                        <div className="px-5 py-4 space-y-3">
                            <p className={sectionHeaderClass}>Related meeting</p>
                            <p className={`${metaTextClass} text-muted-foreground`}>
                                {meeting ? "Assigned to meeting" : "Not yet assigned"}
                            </p>
                            <div className="rounded-md border p-3">
                                {meeting ? (
                                    <Link
                                        href={`/meetings/${meeting.id}`}
                                        className="block hover:bg-muted rounded-md transition-colors -m-1 p-1"
                                    >
                                        <p className="text-drawer-value font-medium">{meeting.title}</p>
                                        <div className={`flex items-center gap-2 ${metaTextClass} text-muted-foreground mt-1`}>
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {format(new Date(meeting.scheduled_date), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className={`${metaTextClass} text-muted-foreground`}>
                                        <p>Not yet assigned to a meeting.</p>
                                        <p className={`mt-1 ${metaTextClass}`}>
                                            Assign this speaker to a meeting agenda.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <Separator />
                    <div className="px-5 py-4 shrink-0">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !name.trim() || !topic.trim()}
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
                        <AlertDialogTitle>Delete Speaker</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{speaker?.name}&quot;? This action cannot be undone.
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
