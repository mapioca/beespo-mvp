"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { User, Trash2, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import {
    getParticipantHistory,
    type ParticipantHistoryItem,
} from "@/lib/actions/meeting-actions";
import {
    assignTagToDirectoryEntry,
    removeTagFromDirectoryEntry,
    createDirectoryTag,
} from "@/lib/actions/directory-tag-actions";
import { TagPicker } from "@/components/participants/tag-picker";
import type { DirectoryTag } from "@/types/database";
import type { Participant } from "./directory-table";

const ITEM_TYPE_LABELS: Record<string, string> = {
    speaker: "Speaker",
    procedural: "Procedural",
    discussion: "Discussion",
    business: "Business",
    announcement: "Announcement",
};

interface ParticipantDrawerProps {
    participant: Participant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (id: string) => Promise<void>;
    canManage: boolean;
    workspaceTags: DirectoryTag[];
    onTagCreated?: (tag: DirectoryTag) => void;
}

export function ParticipantDrawer({
    participant,
    open,
    onOpenChange,
    onDelete,
    canManage,
    workspaceTags,
    onTagCreated,
}: ParticipantDrawerProps) {
    const router = useRouter();
    const sectionHeaderClass =
        "text-drawer-section font-semibold tracking-[0.02em] text-foreground/60";
    const propertyLabelClass =
        "text-drawer-label text-foreground/75";
    const propertyValueClass =
        "text-drawer-value font-medium leading-none tracking-normal";
    const metaTextClass =
        "text-drawer-meta";
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [name, setName] = useState("");
    const [gender, setGender] = useState<"male" | "female" | "unspecified">("unspecified");

    // History state
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyItems, setHistoryItems] = useState<ParticipantHistoryItem[]>([]);

    // Tags state
    const [localTags, setLocalTags] = useState<DirectoryTag[]>([]);

    useEffect(() => {
        if (participant) {
            setName(participant.name);
            setGender(participant.gender === "male" || participant.gender === "female" ? participant.gender : "unspecified");
            setLocalTags(participant.tags || []);
        }
    }, [participant]);

    const fetchHistory = useCallback(async () => {
        if (!participant) return;
        setHistoryLoading(true);
        setHistoryItems([]);
        try {
            const { items, error } = await getParticipantHistory(participant.id);
            if (error) {
                toast.error("Failed to load assignment history");
            } else {
                setHistoryItems(items);
            }
        } catch (error) {
            console.error("Failed to fetch participant history:", error);
            toast.error("Failed to load assignment history");
        } finally {
            setHistoryLoading(false);
        }
    }, [participant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (open && participant) {
            fetchHistory();
        }
    }, [open, participant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const creatorName = participant?.profiles?.full_name;

    const handleSave = async () => {
        if (!participant || !name.trim()) return;
        setIsSaving(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("directory") as any)
            .update({
                name: name.trim(),
                gender: gender === "unspecified" ? null : gender,
            })
            .eq("id", participant.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Participant updated.");
            router.refresh();
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!participant) return;
        setIsDeleting(true);
        await onDelete(participant.id);
        setIsDeleting(false);
        setShowDeleteDialog(false);
        onOpenChange(false);
    };

    const handleTagToggle = async (tag: DirectoryTag, add: boolean) => {
        if (!participant) return;

        try {
            if (add) {
                const { error } = await assignTagToDirectoryEntry(participant.id, tag.id);
                if (error) {
                    toast.error(error);
                } else {
                    setLocalTags((prev) => [...prev, tag]);
                    router.refresh();
                }
            } else {
                const { error } = await removeTagFromDirectoryEntry(participant.id, tag.id);
                if (error) {
                    toast.error(error);
                } else {
                    setLocalTags((prev) => prev.filter((t) => t.id !== tag.id));
                    router.refresh();
                }
            }
        } catch (error) {
            console.error("Failed to update directory tag assignment:", error);
            toast.error("Failed to update tags");
        }
    };

    const handleCreateTag = async (name: string, color: string) => {
        try {
            const { data, error } = await createDirectoryTag({ name, color });
            if (error) {
                toast.error(error);
                return null;
            }
            if (data) {
                onTagCreated?.(data);
                return data;
            }
            return null;
        } catch (error) {
            console.error("Failed to create directory tag:", error);
            toast.error("Failed to create tag");
            return null;
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-[440px] flex flex-col gap-0 p-0 overflow-hidden bg-chrome text-foreground border-l border-chrome">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-12 shrink-0 border-b border-border/70">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground stroke-[1.6]" />
                            <SheetTitle className="text-drawer-title font-semibold">Directory Details</SheetTitle>
                        </div>
                        {canManage && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="h-3.5 w-3.5 stroke-[1.6]" />
                            </Button>
                        )}
                    </div>
                    <SheetDescription className="sr-only">
                        Participant details for {participant?.name}
                    </SheetDescription>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* PARTICIPANT section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className={sectionHeaderClass}>
                                Profile
                            </p>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`h-10 rounded-full bg-background border-border/80 focus-visible:ring-0 focus-visible:border-foreground/40 ${propertyValueClass}`}
                                    disabled={!canManage}
                                    onKeyDown={(e) => e.key === "Enter" && canManage && handleSave()}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Gender</label>
                                <Select
                                    value={gender}
                                    onValueChange={(value) =>
                                        setGender(value as "male" | "female" | "unspecified")
                                    }
                                    disabled={!canManage}
                                >
                                    <SelectTrigger className={`h-10 rounded-full bg-background border-border/80 focus-visible:ring-0 focus-visible:border-foreground/40 ${propertyValueClass}`}>
                                        <SelectValue placeholder="Unspecified" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unspecified">Unspecified</SelectItem>
                                        <SelectItem value="male">Brother (he/him)</SelectItem>
                                        <SelectItem value="female">Sister (she/her)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator className="bg-border/70" />

                        {/* TAGS section */}
                        <div className="px-5 py-4 space-y-3">
                            <p className={sectionHeaderClass}>
                                Tags
                            </p>
                            <TagPicker
                                participantId={participant?.id || ""}
                                currentTags={localTags}
                                workspaceTags={workspaceTags}
                                canManage={canManage}
                                onToggle={handleTagToggle}
                                onCreateTag={handleCreateTag}
                            />
                        </div>

                        <Separator className="bg-border/70" />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-3">
                            <p className={sectionHeaderClass}>
                                Details
                            </p>
                            {participant && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className={`${metaTextClass} text-foreground/72 shrink-0`}>Created at</span>
                                    <span className={`${metaTextClass} text-right text-foreground/88`}>
                                        {format(new Date(participant.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                            )}
                            {creatorName && (
                                <div className="flex items-center justify-between">
                                    <span className={`${metaTextClass} text-foreground/72`}>Created by</span>
                                    <span className={`${metaTextClass} text-foreground/88`}>{creatorName}</span>
                                </div>
                            )}
                        </div>

                        <Separator className="bg-border/70" />

                        {/* ASSIGNMENT HISTORY section */}
                        <div className="px-5 py-4 space-y-3">
                            <p className={sectionHeaderClass}>
                                Assignment History
                            </p>

                            {historyLoading ? (
                                <div className="flex items-center gap-2 py-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                    <span className={`${metaTextClass} text-foreground/72`}>Loading...</span>
                                </div>
                            ) : historyItems.length === 0 ? (
                                <p className={`${metaTextClass} text-foreground/65 italic`}>
                                    No assignment history found.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {historyItems.map((item) => (
                                        <div key={item.id} className="space-y-0.5">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className={`${metaTextClass} font-medium leading-snug`}>
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 bg-muted px-1.5 py-0.5 rounded">
                                                    {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                                                </span>
                                            </div>
                                            {item.meeting && (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 text-muted-foreground/60 shrink-0 stroke-[1.6]" />
                                                    <span className={`${metaTextClass} text-foreground/72`}>
                                                        {format(new Date(item.meeting.scheduled_date), "MMM d, yyyy")}
                                                    </span>
                                                    <span className="text-muted-foreground/40 text-[11px]">·</span>
                                                    <span className={`${metaTextClass} text-foreground/72 truncate`}>
                                                        {item.meeting.title}
                                                    </span>
                                                </div>
                                            )}
                                            {item.description && (
                                                <p className={`${metaTextClass} text-foreground/65 truncate`}>
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    {canManage && (
                        <>
                            <Separator className="bg-border/70" />
                            <div className="px-5 py-4 shrink-0">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || !name.trim()}
                                    className="w-full h-9 rounded-full text-[12px] font-semibold"
                                >
                                    {isSaving ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Participant</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{participant?.name}&quot;? This
                            action cannot be undone.
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
