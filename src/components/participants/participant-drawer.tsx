"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import type { Participant } from "./participants-table";

interface ParticipantDrawerProps {
    participant: Participant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (id: string) => Promise<void>;
    canManage: boolean;
}

export function ParticipantDrawer({ participant, open, onOpenChange, onDelete, canManage }: ParticipantDrawerProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [name, setName] = useState("");

    useEffect(() => {
        if (participant) {
            setName(participant.name);
        }
    }, [participant?.id]);

    const creatorName = participant?.profiles?.full_name;

    const handleSave = async () => {
        if (!participant || !name.trim()) return;
        setIsSaving(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("participants") as any)
            .update({ name: name.trim() })
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

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-sm flex flex-col gap-0 p-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-12 shrink-0">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <SheetTitle className="text-sm font-semibold">Participant Details</SheetTitle>
                        </div>
                        {canManage && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                    <SheetDescription className="sr-only">
                        Participant details for {participant?.name}
                    </SheetDescription>

                    <Separator />

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* PARTICIPANT section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Participant
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-8 text-sm"
                                    disabled={!canManage}
                                    onKeyDown={(e) => e.key === "Enter" && canManage && handleSave()}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Details
                            </p>
                            {participant && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-xs text-muted-foreground shrink-0">Created at</span>
                                    <span className="text-xs text-right">
                                        {format(new Date(participant.created_at), "MMM d, yyyy 'at' h:mm a")}
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
                    </div>

                    {/* Footer */}
                    {canManage && (
                        <>
                            <Separator />
                            <div className="px-5 py-4 shrink-0">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || !name.trim()}
                                    className="w-full h-8 text-xs"
                                >
                                    {isSaving ? "Saving..." : "Save Changes"}
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
                            Are you sure you want to delete &quot;{participant?.name}&quot;? This action cannot be undone.
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
