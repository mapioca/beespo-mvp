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
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CreateSpeakerDialog } from "./create-speaker-dialog";

interface Speaker {
    id: string;
    name: string;
    topic: string | null;
    is_confirmed: boolean;
}

interface SpeakerWithAssignment extends Speaker {
    isAssignedToOtherMeeting: boolean;
    isSelectedInCurrentMeeting: boolean;
}

interface SpeakerSelectorProps {
    selectedSpeakerId?: string | null;
    onSelect: (speaker: Speaker | null) => void;
    onCreateNew?: () => void; // Made optional - we'll handle it internally now
    selectedSpeakerIdsInMeeting?: string[]; // IDs of speakers already selected in this meeting's agenda
}

export function SpeakerSelector({
    selectedSpeakerId,
    onSelect,
    onCreateNew,
    selectedSpeakerIdsInMeeting = [],
}: SpeakerSelectorProps) {
    const [open, setOpen] = useState(false);
    const [speakers, setSpeakers] = useState<SpeakerWithAssignment[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    useEffect(() => {
        if (open) {
            loadSpeakers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedSpeakerIdsInMeeting]);

    const loadSpeakers = async () => {
        setIsLoading(true);
        const supabase = createClient();

        // Get all speakers in the workspace
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

        // Get speakers that are already assigned to existing meetings (via agenda_items)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignedSpeakers } = await (supabase.from("agenda_items") as any)
            .select("speaker_id, meeting_id")
            .not("speaker_id", "is", null)
            .not("meeting_id", "is", null);

        const assignedSpeakerIds = new Set(
            (assignedSpeakers || []).map((a: { speaker_id: string }) => a.speaker_id)
        );

        // Set to track speakers selected in current meeting composition
        const selectedInMeetingSet = new Set(selectedSpeakerIdsInMeeting);

        // Map speakers with assignment info and filter
        const mappedSpeakers: SpeakerWithAssignment[] = allSpeakers
            .map((s: Speaker) => ({
                ...s,
                isAssignedToOtherMeeting: assignedSpeakerIds.has(s.id) && !selectedInMeetingSet.has(s.id),
                isSelectedInCurrentMeeting: selectedInMeetingSet.has(s.id),
            }))
            // Filter out speakers assigned to other meetings (unless they're the currently selected one)
            .filter((s: SpeakerWithAssignment) =>
                !s.isAssignedToOtherMeeting || s.id === selectedSpeakerId
            );

        // Sort: selected in this meeting first, then by name
        mappedSpeakers.sort((a: SpeakerWithAssignment, b: SpeakerWithAssignment) => {
            if (a.isSelectedInCurrentMeeting && !b.isSelectedInCurrentMeeting) return -1;
            if (!a.isSelectedInCurrentMeeting && b.isSelectedInCurrentMeeting) return 1;
            return a.name.localeCompare(b.name);
        });

        setSpeakers(mappedSpeakers);
        setIsLoading(false);
    };

    const filteredSpeakers = speakers.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedSpeaker = speakers.find((s) => s.id === selectedSpeakerId);

    const handleCreateNew = () => {
        if (onCreateNew) {
            onCreateNew();
        } else {
            setCreateDialogOpen(true);
        }
        setOpen(false);
    };

    const handleSpeakerCreated = (speaker: Speaker) => {
        setCreateDialogOpen(false);
        onSelect(speaker);
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {selectedSpeaker ? (
                            <span className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {selectedSpeaker.name}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">Select speaker...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2 border-b">
                        <Input
                            placeholder="Search speakers..."
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
                        ) : filteredSpeakers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                {search ? "No speakers match your search" : "No available speakers"}
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredSpeakers.map((speaker) => (
                                    <button
                                        key={speaker.id}
                                        onClick={() => {
                                            onSelect(speaker);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left p-2 hover:bg-accent transition-colors flex items-center gap-2",
                                            selectedSpeakerId === speaker.id && "bg-accent"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4",
                                                selectedSpeakerId === speaker.id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {speaker.name}
                                            </div>
                                            {speaker.topic && (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {speaker.topic}
                                                </div>
                                            )}
                                        </div>
                                        {speaker.isSelectedInCurrentMeeting && speaker.id !== selectedSpeakerId && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                                                In this meeting
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="p-2 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={handleCreateNew}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Speaker
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <CreateSpeakerDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onCreated={handleSpeakerCreated}
            />
        </>
    );
}
