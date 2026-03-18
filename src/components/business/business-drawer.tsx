"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Briefcase, Trash2, Plus, Minus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import type { BusinessItem } from "./business-table";

const CATEGORY_OPTIONS = [
    { value: "sustaining", label: "Sustaining" },
    { value: "release", label: "Release" },
    { value: "confirmation", label: "Confirmation" },
    { value: "ordination", label: "Ordination" },
    { value: "setting_apart", label: "Setting Apart" },
    { value: "other", label: "Other" },
];



interface BusinessDrawerProps {
    item: BusinessItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (id: string) => Promise<void>;
}

export function BusinessDrawer({ item, open, onOpenChange, onDelete }: BusinessDrawerProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Editable fields
    const [personName, setPersonName] = useState("");
    const [positionCalling, setPositionCalling] = useState("");
    const [category, setCategory] = useState("");
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState("");

    // Sync state when the selected item changes
    useEffect(() => {
        if (item) {
            setPersonName(item.person_name);
            setPositionCalling(item.position_calling ?? "");
            setCategory(item.category);
            setNotes(item.notes ?? "");
            setShowNotes(!!item.notes);
        }
    }, [item?.id]);

    const isCompleted = item?.status === "completed";
    const creatorName = item?.creator?.full_name;

    const handleSave = async () => {
        if (!item || !personName.trim() || !category) return;
        setIsSaving(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("business_items") as any)
            .update({
                person_name: personName.trim(),
                position_calling: positionCalling.trim() || null,
                category,
                notes: showNotes && notes.trim() ? notes.trim() : null,
            })
            .eq("id", item.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Business item updated.");
            router.refresh();
        }
        setIsSaving(false);
    };

    const handleToggleStatus = async () => {
        if (!item) return;
        setIsUpdatingStatus(true);
        const supabase = createClient();
        const newStatus = isCompleted ? "pending" : "completed";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("business_items") as any)
            .update({
                status: newStatus,
                action_date: newStatus === "completed" ? new Date().toISOString().split("T")[0] : null,
            })
            .eq("id", item.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(newStatus === "completed" ? "Marked as complete!" : "Marked as pending.");
            router.refresh();
        }
        setIsUpdatingStatus(false);
    };

    const handleDelete = async () => {
        if (!item) return;
        setIsDeleting(true);
        await onDelete(item.id);
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
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <SheetTitle className="text-sm font-semibold">Business Item Details</SheetTitle>
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
                        Business item details for {item?.person_name}
                    </SheetDescription>

                    <Separator />

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* BUSINESS ITEM section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Business Item
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Person Name</label>
                                <Input
                                    value={personName}
                                    onChange={(e) => setPersonName(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Position / Calling</label>
                                <Input
                                    value={positionCalling}
                                    onChange={(e) => setPositionCalling(e.target.value)}
                                    placeholder="e.g., Sunday School President"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Category</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Details
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Status</span>
                                <Badge variant={isCompleted ? "outline" : "secondary"} className="text-xs">
                                    {isCompleted ? "Completed" : "Pending"}
                                </Badge>
                            </div>

                            {item?.action_date && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-xs text-muted-foreground shrink-0">Action Date</span>
                                    <span className="text-xs text-right">
                                        {format(new Date(item.action_date), "MMM d, yyyy")}
                                    </span>
                                </div>
                            )}
                            {item && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-xs text-muted-foreground shrink-0">Created at</span>
                                    <span className="text-xs text-right">
                                        {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
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
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2 h-8 text-xs font-normal"
                                onClick={handleToggleStatus}
                                disabled={isUpdatingStatus}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                {isUpdatingStatus
                                    ? "Updating..."
                                    : isCompleted
                                    ? "Mark as Pending"
                                    : "Mark as Complete"}
                            </Button>
                        </div>

                        <Separator />

                        {/* NOTES section */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    Notes
                                </p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        if (showNotes) {
                                            setShowNotes(false);
                                            setNotes("");
                                        } else {
                                            setShowNotes(true);
                                        }
                                    }}
                                >
                                    {showNotes ? (
                                        <Minus className="h-3 w-3" />
                                    ) : (
                                        <Plus className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                            {showNotes && (
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add a note..."
                                    className="text-sm resize-none"
                                    rows={3}
                                    autoFocus={!item?.notes}
                                />
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <Separator />
                    <div className="px-5 py-4 shrink-0">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !personName.trim() || !category}
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
                        <AlertDialogTitle>Delete Business Item</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{item?.person_name}&quot;? This action cannot be undone.
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
