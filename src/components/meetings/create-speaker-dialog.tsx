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
import { useToast } from "@/lib/hooks/use-toast";

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
    const { toast } = useToast();
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
            toast({
                title: "Error",
                description: "Not authenticated. Please log in again.",
                variant: "destructive",
            });
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
            toast({
                title: "Error",
                description: "Only leaders and admins can create speakers.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        // Create speaker
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: speaker, error } = await (supabase.from("speakers") as any)
            .insert({
                name,
                topic,
                is_confirmed: isConfirmed,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to create speaker.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        toast({
            title: "Success",
            description: "Speaker created and selected!",
        });

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
