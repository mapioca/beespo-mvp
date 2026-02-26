"use client";

import { useState, useEffect } from "react";
import { ToolboxItem } from "./types";
import dynamic from "next/dynamic";

const IconPicker = dynamic(() => import("./icon-picker"), { ssr: false });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SpinnerIcon, UserIcon, MusicNoteIcon, FileTextIcon, TrashIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CreateItemTypeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string | null;
    onCreated: () => void;
    initialData?: ToolboxItem | null;
}

export function CreateItemTypeDialog({
    open,
    onOpenChange,
    workspaceId,
    onCreated,
    initialData,
}: CreateItemTypeDialogProps) {
    const [name, setName] = useState("");
    const [iconName, setIconName] = useState("StarIcon");
    const [requiresAssignee, setRequiresAssignee] = useState(false);
    const [requiresSpeaker, setRequiresSpeaker] = useState(false);
    const [requiresResource, setRequiresResource] = useState(false);
    const [hasRichText, setHasRichText] = useState(false);
    const [defaultDuration, setDefaultDuration] = useState(5);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (open && initialData) {
            setName(initialData.title);
            setIconName(initialData.icon || "StarIcon");
            setRequiresAssignee(initialData.config?.requires_assignee || false);
            setRequiresSpeaker(initialData.category === "speaker");
            setRequiresResource(initialData.config?.requires_resource || false);
            setHasRichText(initialData.config?.has_rich_text || false);
            setDefaultDuration(initialData.duration_minutes || 5);
        } else if (open && !initialData) {
            resetForm();
        }
    }, [open, initialData]);

    const resetForm = () => {
        setName("");
        setIconName("StarIcon");
        setRequiresAssignee(false);
        setRequiresResource(false);
        setHasRichText(false);
        setDefaultDuration(5);
    };

    const handleDeleteCustomItem = async () => {
        if (!initialData?.procedural_item_type_id) return;

        setIsDeleting(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("procedural_item_types") as any)
            .delete()
            .eq("id", initialData.procedural_item_type_id);

        setIsDeleting(false);

        if (error) {
            toast.error("Failed to delete item type", { description: error.message || "Please try again." });
            return;
        }

        toast.success("Item type deleted", { description: `"${name}" has been removed.` });
        onCreated(); // Refresh the list
        onOpenChange(false); // Close the dialog
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error("Name required", { description: "Please enter a name for the item type." });
            return;
        }

        if (!workspaceId) {
            toast.error("No workspace", { description: "You must be in a workspace to create custom items." });
            return;
        }

        setIsCreating(true);
        const supabase = createClient();

        let error;

        if (initialData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await (supabase.from("procedural_item_types") as any)
                .update({
                    name: name.trim(),
                    icon: iconName,
                    category: requiresSpeaker ? "speaker" : "procedural",
                    requires_assignee: requiresAssignee,
                    requires_resource: requiresResource,
                    has_rich_text: hasRichText,
                    is_hymn: requiresResource,
                    default_duration_minutes: defaultDuration,
                })
                .eq("id", initialData.procedural_item_type_id);
            error = updateError;
        } else {
            // Generate a unique ID based on workspace and name
            const itemId = `custom-${workspaceId.slice(0, 8)}-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insertError } = await (supabase.from("procedural_item_types") as any)
                .insert({
                    id: itemId,
                    name: name.trim(),
                    is_custom: true,
                    is_core: false,
                    icon: iconName,
                    workspace_id: workspaceId,
                    category: requiresSpeaker ? "speaker" : "procedural",
                    requires_assignee: requiresAssignee,
                    requires_resource: requiresResource,
                    has_rich_text: hasRichText,
                    is_hymn: requiresResource, // If requires resource, treat as hymn-like
                    default_duration_minutes: defaultDuration,
                    order_hint: 100, // Custom items sorted after core items
                });
            error = insertError;
        }

        setIsCreating(false);

        if (error) {
            toast.error(`Failed to ${initialData ? "update" : "create"} item type`, { description: error.message || "Please try again." });
            return;
        }

        toast.success(`Item type ${initialData ? "updated" : "created"}`, { description: `"${name}" has been ${initialData ? "updated in" : "added to"} your custom elements.` });

        resetForm();
        onCreated();
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Custom Item Type" : "Create Custom Item Type"}</DialogTitle>
                    <DialogDescription>
                        {initialData ? "Edit the item type for your meeting agendas." : "Create a new item type for your meeting agendas."}
                        Configure its behavior using the options below.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isCreating && name.trim()) {
                        handleCreate();
                    }
                }}>

                    <div className="space-y-6 py-4">
                        <div className="flex gap-4">
                            {/* Icon Picker */}
                            <div className="space-y-2 shrink-0">
                                <Label>Icon</Label>
                                <div>
                                    <IconPicker value={iconName} onChange={setIconName} disabled={isCreating} />
                                </div>
                            </div>

                            {/* Name Input */}
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="item-name">Name</Label>
                                <Input
                                    id="item-name"
                                    placeholder="e.g., Testimony, Special Musical Number"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                        </div>

                        {/* Default Duration */}
                        <div className="space-y-2">
                            <Label htmlFor="default-duration">Default Duration (minutes)</Label>
                            <Input
                                id="default-duration"
                                type="number"
                                min={1}
                                max={120}
                                value={defaultDuration}
                                onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 5)}
                                disabled={isCreating}
                                className="w-24"
                            />
                        </div>

                        {/* Behavior Toggles */}
                        <div className="space-y-4">
                            <Label className="text-sm font-medium">Behavior Options</Label>

                            {/* Assignable Person */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <UserIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="requires-assignee" className="font-normal cursor-pointer">
                                            Assignable Person
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Shows a person picker to assign someone
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="requires-assignee"
                                    checked={requiresAssignee}
                                    onCheckedChange={setRequiresAssignee}
                                    disabled={isCreating}
                                />
                            </div>

                            {/* Assignable Speaker */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <UserIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="requires-speaker" className="font-normal cursor-pointer">
                                            Assignable Speaker
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Shows a speaker picker for the assignment
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="requires-speaker"
                                    checked={requiresSpeaker}
                                    onCheckedChange={setRequiresSpeaker}
                                    disabled={isCreating}
                                />
                            </div>

                            {/* Musical Resource */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <MusicNoteIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="requires-resource" className="font-normal cursor-pointer">
                                            Musical Resource
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Shows a hymn/music picker
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="requires-resource"
                                    checked={requiresResource}
                                    onCheckedChange={setRequiresResource}
                                    disabled={isCreating}
                                />
                            </div>

                            {/* Description/Notes */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <FileTextIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="has-rich-text" className="font-normal cursor-pointer">
                                            Description/Notes
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Shows a text editor for additional notes
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="has-rich-text"
                                    checked={hasRichText}
                                    onCheckedChange={setHasRichText}
                                    disabled={isCreating}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex-row items-center justify-between sm:justify-between w-full">
                        <div className="flex-1">
                            {initialData && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            className="text-black hover:text-destructive hover:bg-destructive/10 transition-colors h-9 px-3"
                                            disabled={isCreating || isDeleting}
                                        >
                                            <TrashIcon weight="fill" className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the custom item type &quot;{name}&quot;.
                                                This action cannot be undone. Existing agenda items of this type will remain but will lose their type reference.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={handleDeleteCustomItem}
                                            >
                                                {isDeleting ? "Deleting..." : "Delete Item"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => handleOpenChange(false)}
                                disabled={isCreating || isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || isDeleting || !name.trim()}>
                                {isCreating ? (
                                    <>
                                        <SpinnerIcon weight="fill" className="mr-2 h-4 w-4 animate-spin" />
                                        {initialData ? "Saving..." : "Creating..."}
                                    </>
                                ) : (
                                    initialData ? "Save Changes" : "Create Item Type"
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
