"use client";

import { useState, useEffect } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Plus, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Participant {
    id: string;
    name: string;
}

interface ParticipantPopoverProps {
    currentParticipantId?: string | null;
    currentParticipantName?: string | null;
    onSelect: (participant: Participant | null) => void;
    trigger?: React.ReactNode;
    disabled?: boolean;
}

export function ParticipantPopover({
    currentParticipantId,
    currentParticipantName,
    onSelect,
    trigger,
    disabled = false,
}: ParticipantPopoverProps) {
    const [open, setOpen] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");

    useEffect(() => {
        if (open) {
            loadParticipants();
        }
    }, [open]);

    const loadParticipants = async () => {
        setIsLoading(true);
        const supabase = createClient();

        // Get current user's workspace
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoading(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) {
            setIsLoading(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("participants") as any)
            .select("id, name")
            .eq("workspace_id", profile.workspace_id)
            .order("name");

        if (error) {
            console.error("Error loading participants:", error);
        } else {
            setParticipants(data || []);
        }
        setIsLoading(false);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("participants") as any)
            .insert({
                name: newName.trim(),
                workspace_id: profile.workspace_id,
            })
            .select()
            .single();

        if (!error && data) {
            onSelect({ id: data.id, name: data.name });
            setOpen(false);
            setNewName("");
            setIsCreating(false);
        }
    };

    const filteredParticipants = participants.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleClear = () => {
        onSelect(null);
        setOpen(false);
    };

    const defaultTrigger = (
        <button
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm",
                "hover:bg-muted transition-colors cursor-pointer",
                "border border-transparent hover:border-border",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
        >
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={currentParticipantName ? "text-foreground" : "text-muted-foreground"}>
                {currentParticipantName || "Assign participant"}
            </span>
        </button>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || defaultTrigger}
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                {isCreating ? (
                    <div className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">New Participant</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewName("");
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <Input
                            placeholder="Enter name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                                if (e.key === "Escape") {
                                    setIsCreating(false);
                                    setNewName("");
                                }
                            }}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewName("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1"
                                onClick={handleCreate}
                                disabled={!newName.trim()}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-2 border-b">
                            <Input
                                placeholder="Search participants..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <ScrollArea className="h-[200px]">
                            {isLoading ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            ) : filteredParticipants.length === 0 && !search ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No participants yet
                                </div>
                            ) : filteredParticipants.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No matches found
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredParticipants.map((participant) => (
                                        <button
                                            key={participant.id}
                                            onClick={() => {
                                                onSelect(participant);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left p-2 hover:bg-accent transition-colors flex items-center gap-2",
                                                currentParticipantId === participant.id && "bg-accent"
                                            )}
                                        >
                                            <Check
                                                className={cn(
                                                    "h-4 w-4 shrink-0",
                                                    currentParticipantId === participant.id
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            <span className="font-medium truncate">
                                                {participant.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <div className="p-2 border-t space-y-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setIsCreating(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create new participant
                            </Button>
                            {currentParticipantId && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-muted-foreground"
                                    onClick={handleClear}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Clear assignment
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
