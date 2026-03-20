"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

interface Speaker {
    id: string;
    name: string;
    topic: string;
    is_confirmed: boolean;
}

interface CreateSpeakerDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: (speaker: Speaker) => void;
}

export function CreateSpeakerDialog({
    open,
    onClose,
    onCreated,
}: CreateSpeakerDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [topic, setTopic] = useState("");
    const [isConfirmed, setIsConfirmed] = useState(false);

    const resetForm = () => {
        setName("");
        setTopic("");
        setIsConfirmed(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            toast.error("Not authenticated. Please log in again.");
            setIsLoading(false);
            return;
        }

        // Get user profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id, role")
            .eq("id", user.id)
            .single();

        if (!profile || !["leader", "admin"].includes(profile.role)) {
            toast.error("Only leaders and admins can create speakers.");
            setIsLoading(false);
            return;
        }

        // Find or create directory entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let { data: dirEntry } = await (supabase.from("directory") as any)
            .select("id")
            .eq("workspace_id", profile.workspace_id)
            .eq("name", name.trim())
            .single();

        if (!dirEntry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: newDir, error: dirError } = await (supabase.from("directory") as any)
                .insert({
                    name: name.trim(),
                    workspace_id: profile.workspace_id,
                    created_by: user.id,
                })
                .select()
                .single();

            if (dirError) {
                toast.error(dirError.message || "Failed to create directory entry.");
                setIsLoading(false);
                return;
            }
            dirEntry = newDir;
        }

        // Create meeting_assignment with type 'speaker'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignment, error } = await (supabase.from("meeting_assignments") as any)
            .insert({
                directory_id: dirEntry.id,
                assignment_type: "speaker",
                topic,
                is_confirmed: isConfirmed,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            toast.error(error.message || "Failed to create speaker.");
            setIsLoading(false);
            return;
        }

        const speaker: Speaker = {
            id: assignment.id,
            name: name.trim(),
            topic: assignment.topic,
            is_confirmed: assignment.is_confirmed,
        };

        toast.success("Speaker created and selected!");

        setIsLoading(false);
        resetForm();
        onCreated(speaker);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Speaker</DialogTitle>
                        <DialogDescription>
                            Add a new speaker that will be automatically assigned to this meeting.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="speaker-name">Speaker Name *</Label>
                            <Input
                                id="speaker-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Brother John Smith"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="speaker-topic">Topic *</Label>
                            <Textarea
                                id="speaker-topic"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="What will they speak about?"
                                rows={3}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="speaker-confirmed"
                                checked={isConfirmed}
                                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                                disabled={isLoading}
                            />
                            <Label
                                htmlFor="speaker-confirmed"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Speaker is confirmed
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !name || !topic}>
                            {isLoading ? "Creating..." : "Create & Select"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
