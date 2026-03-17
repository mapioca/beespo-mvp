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
import { Search, Speech, Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface Speaker {
    id: string;
    name: string;
    topic: string | null;
    is_confirmed: boolean;
}

export interface SpeakerSelection {
    id: string;
    name: string;
    topic: string | null;
    is_confirmed: boolean;
}

interface SpeakerSelectorPopoverProps {
    children: React.ReactNode;
    currentSpeakerId?: string;
    selectedSpeakerIdsInMeeting?: string[];
    onSelect: (speaker: SpeakerSelection) => void;
}

export function SpeakerSelectorPopover({
    children,
    currentSpeakerId,
    selectedSpeakerIdsInMeeting = [],
    onSelect,
}: SpeakerSelectorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newName, setNewName] = useState("");
    const [newTopic, setNewTopic] = useState("");

    const loadSpeakers = useCallback(async () => {
        setIsLoading(true);
        const supabase = createClient();

        // Get all workspace speakers via RLS
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: allSpeakers, error } = await (supabase.from("speakers") as any)
            .select("id, name, topic, is_confirmed")
            .order("name");

        if (error) {
            console.error("Error loading speakers:", error);
            setIsLoading(false);
            return;
        }

        if (!allSpeakers) {
            setSpeakers([]);
            setIsLoading(false);
            return;
        }

        // Get speakers already assigned to existing meetings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignedSpeakers } = await (supabase.from("agenda_items") as any)
            .select("speaker_id")
            .not("speaker_id", "is", null)
            .not("meeting_id", "is", null);

        const assignedToOtherMeetingIds = new Set(
            (assignedSpeakers || [])
                .map((a: { speaker_id: string }) => a.speaker_id)
                // Keep the current item's speaker and speakers in this meeting draft
                .filter((id: string) => id !== currentSpeakerId && !selectedSpeakerIdsInMeeting.includes(id))
        );

        const filtered = allSpeakers.filter(
            (s: Speaker) => !assignedToOtherMeetingIds.has(s.id)
        );

        setSpeakers(filtered);
        setIsLoading(false);
    }, [currentSpeakerId, selectedSpeakerIdsInMeeting]);

    useEffect(() => {
        if (open && speakers.length === 0) {
            loadSpeakers();
        }
    }, [open, speakers.length, loadSpeakers]);

    const filteredSpeakers = useMemo(() => {
        if (!search.trim()) return speakers;
        const searchLower = search.toLowerCase();
        return speakers.filter((s) =>
            s.name.toLowerCase().includes(searchLower) ||
            (s.topic && s.topic.toLowerCase().includes(searchLower))
        );
    }, [speakers, search]);

    const handleSelect = (speaker: Speaker) => {
        onSelect({
            id: speaker.id,
            name: speaker.name,
            topic: speaker.topic,
            is_confirmed: speaker.is_confirmed,
        });
        setOpen(false);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setIsSubmitting(true);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Not authenticated.");
            setIsSubmitting(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id, role")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) {
            toast.error("Could not determine workspace.");
            setIsSubmitting(false);
            return;
        }

        if (!["leader", "admin"].includes(profile.role)) {
            toast.error("Only leaders and admins can create speakers.");
            setIsSubmitting(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("speakers") as any)
            .insert({
                name: newName.trim(),
                topic: newTopic.trim() || null,
                is_confirmed: false,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (!error && data) {
            setSpeakers((prev) =>
                [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
            );
            onSelect({ id: data.id, name: data.name, topic: data.topic, is_confirmed: data.is_confirmed });
            setIsCreating(false);
            setNewName("");
            setNewTopic("");
            setOpen(false);
        } else if (error) {
            toast.error("Failed to create speaker.", { description: error.message });
        }

        setIsSubmitting(false);
    };

    return (
        <Popover
            open={open}
            onOpenChange={(val) => {
                setOpen(val);
                if (!val) {
                    setIsCreating(false);
                    setNewName("");
                    setNewTopic("");
                    setSearch("");
                }
            }}
        >
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                side="left"
                align="start"
                className="w-[300px] p-0 flex flex-col shadow-xl mb-4 ml-4 overflow-hidden border-border/50"
            >
                {/* Header */}
                <div className="p-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Select Speaker
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-6 w-6"
                            onClick={() => setIsCreating(!isCreating)}
                            title={isCreating ? "Cancel" : "Add new speaker"}
                        >
                            <Plus
                                className={cn("h-4 w-4", isCreating ? "text-primary rotate-45 transition-transform" : "text-muted-foreground")}
                            />
                        </Button>
                    </div>

                    {isCreating ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <Input
                                placeholder="Speaker name..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !newTopic) handleCreate();
                                    if (e.key === "Escape") setIsCreating(false);
                                }}
                            />
                            <Input
                                placeholder="Topic (optional)..."
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                className="h-8 text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate();
                                    if (e.key === "Escape") setIsCreating(false);
                                }}
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    type="button"
                                    className="h-7 flex-1 text-xs"
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || isSubmitting}
                                >
                                    {isSubmitting ? "Creating..." : "Create & Select"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    className="h-7 text-xs"
                                    onClick={() => setIsCreating(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                            />
                            <Input
                                placeholder="Search speakers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 h-8 text-sm"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* List */}
                {!isCreating && (
                    <ScrollArea className="h-[250px] w-full">
                        {isLoading ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        ) : filteredSpeakers.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                                <Speech className="h-8 w-8 text-muted-foreground/40" />
                                <span>
                                    {search ? "No matches found" : "No available speakers"}
                                </span>
                            </div>
                        ) : (
                            <div className="p-1">
                                {filteredSpeakers.map((s) => (
                                    <button
                                        type="button"
                                        key={s.id}
                                        onClick={() => handleSelect(s)}
                                        className={cn(
                                            "w-full text-left px-2 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2 group",
                                            currentSpeakerId === s.id && "bg-accent/50 text-accent-foreground font-medium"
                                        )}
                                    >
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm truncate">{s.name}</span>
                                            {s.topic && (
                                                <span className="text-[11px] text-muted-foreground truncate">
                                                    {s.topic}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!s.is_confirmed && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600">
                                                    Unconfirmed
                                                </span>
                                            )}
                                            {currentSpeakerId === s.id && (
                                                <Check className="h-3.5 w-3.5 text-primary" />
                                            )}
                                        </div>
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
