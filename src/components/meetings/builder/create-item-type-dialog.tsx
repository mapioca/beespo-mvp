"use client";

import { useState } from "react";
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
import { Loader2, User, Music, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";

interface CreateItemTypeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string | null;
    onCreated: () => void;
}

export function CreateItemTypeDialog({
    open,
    onOpenChange,
    workspaceId,
    onCreated,
}: CreateItemTypeDialogProps) {
    const [name, setName] = useState("");
    const [requiresAssignee, setRequiresAssignee] = useState(false);
    const [requiresResource, setRequiresResource] = useState(false);
    const [hasRichText, setHasRichText] = useState(false);
    const [defaultDuration, setDefaultDuration] = useState(5);
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();

    const resetForm = () => {
        setName("");
        setRequiresAssignee(false);
        setRequiresResource(false);
        setHasRichText(false);
        setDefaultDuration(5);
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({
                title: "Name required",
                description: "Please enter a name for the item type.",
                variant: "destructive",
            });
            return;
        }

        if (!workspaceId) {
            toast({
                title: "No workspace",
                description: "You must be in a workspace to create custom items.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        const supabase = createClient();

        // Generate a unique ID based on workspace and name
        const itemId = `custom-${workspaceId.slice(0, 8)}-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("procedural_item_types") as any)
            .insert({
                id: itemId,
                name: name.trim(),
                is_custom: true,
                is_core: false,
                workspace_id: workspaceId,
                requires_assignee: requiresAssignee,
                requires_resource: requiresResource,
                has_rich_text: hasRichText,
                is_hymn: requiresResource, // If requires resource, treat as hymn-like
                default_duration_minutes: defaultDuration,
                order_hint: 100, // Custom items sorted after core items
            });

        setIsCreating(false);

        if (error) {
            toast({
                title: "Failed to create item type",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "Item type created",
            description: `"${name}" has been added to your custom elements.`,
        });

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
                    <DialogTitle>Create Custom Item Type</DialogTitle>
                    <DialogDescription>
                        Create a new item type for your meeting agendas.
                        Configure its behavior using the options below.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="item-name">Name</Label>
                        <Input
                            id="item-name"
                            placeholder="e.g., Testimony, Special Musical Number"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isCreating}
                        />
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
                                <User className="h-4 w-4 text-muted-foreground" />
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

                        {/* Musical Resource */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                                <Music className="h-4 w-4 text-muted-foreground" />
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
                                <FileText className="h-4 w-4 text-muted-foreground" />
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

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
                        {isCreating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Item Type"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
