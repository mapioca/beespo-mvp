"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagnifyingGlassIcon, UserPlusIcon, CheckIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Participant {
    id: string;
    name: string;
    workspace_id: string;
}

interface ParticipantSelectorPopoverProps {
    children: React.ReactNode;
    currentParticipantId?: string;
    onSelect: (participant: { id: string; name: string }) => void;
}

export function ParticipantSelectorPopover({
    children,
    currentParticipantId,
    onSelect,
}: ParticipantSelectorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");

    const loadParticipants = useCallback(async () => {
        setIsLoading(true);
        const supabase = createClient();

        // Get current user's workspace_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoading(false);
            return;
        }

        // Get profile to get workspace_id
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
            .select("id, name, workspace_id")
            .eq("workspace_id", profile.workspace_id)
            .order("name");

        if (!error && data) {
            setParticipants(data);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (open && participants.length === 0) {
            loadParticipants();
        }
    }, [open, participants.length, loadParticipants]);

    const filteredParticipants = useMemo(() => {
        if (!search.trim()) return participants;
        const searchLower = search.toLowerCase();
        return participants.filter((p) =>
            p.name.toLowerCase().includes(searchLower)
        );
    }, [participants, search]);

    const handleSelect = (participant: Participant) => {
        onSelect({
            id: participant.id,
            name: participant.name,
        });
        setOpen(false);
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
                created_by: user.id
            })
            .select()
            .single();

        if (!error && data) {
            setParticipants(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            onSelect({ id: data.id, name: data.name });
            setIsCreating(false);
            setNewName("");
            setOpen(false);
        } else if (error) {
            console.error("Error creating participant:", error);
        }
    };

    return (
        <Popover open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setIsCreating(false);
                setNewName("");
                setSearch("");
            }
        }}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent side="left" align="start" className="w-[300px] p-0 flex flex-col shadow-xl mb-4 ml-4 overflow-hidden border-border/50">
                <div className="p-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Participant</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setIsCreating(!isCreating)}
                        >
                            <UserPlusIcon weight="bold" className={cn("h-4 w-4", isCreating ? "text-primary" : "text-muted-foreground")} />
                        </Button>
                    </div>

                    {isCreating ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <Input
                                placeholder="New participant name..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate();
                                    if (e.key === "Escape") setIsCreating(false);
                                }}
                            />
                            <div className="flex gap-2">
                                <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleCreate} disabled={!newName.trim()}>
                                    Create & Select
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsCreating(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <MagnifyingGlassIcon weight="bold" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search participants..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 h-8 text-sm"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {!isCreating && (
                    <ScrollArea className="h-[250px] w-full">
                        {isLoading ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        ) : filteredParticipants.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                {search ? "No matches found" : "No participants yet"}
                            </div>
                        ) : (
                            <div className="p-1">
                                {filteredParticipants.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelect(p)}
                                        className={cn(
                                            "w-full text-left px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between text-sm group",
                                            currentParticipantId === p.id && "bg-accent/50 text-accent-foreground font-medium"
                                        )}
                                    >
                                        <span className="truncate flex-1">{p.name}</span>
                                        {currentParticipantId === p.id && (
                                            <CheckIcon weight="bold" className="h-3.5 w-3.5 text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                )}
            </PopoverContent>
        </Popover>
    );
}
