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

interface Speaker {
    id: string;
    name: string;
    topic: string | null;
    is_confirmed: boolean;
    meeting_id: string | null;
}

interface SpeakerSelectorProps {
    selectedSpeakerId?: string | null;
    onSelect: (speaker: Speaker | null) => void;
    onCreateNew: () => void;
    meetingId?: string; // For filtering speakers already assigned to this meeting
}

export function SpeakerSelector({
    selectedSpeakerId,
    onSelect,
    onCreateNew,
    meetingId,
}: SpeakerSelectorProps) {
    const [open, setOpen] = useState(false);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadSpeakers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const loadSpeakers = async () => {
        setIsLoading(true);
        const supabase = createClient();

        // Get unassigned speakers and speakers assigned to this meeting
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = (supabase.from("speakers") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("id, name, topic, is_confirmed, meeting_id")
            .order("name");

        const { data, error } = await query;

        if (!error && data) {
            // Filter: show unassigned OR assigned to current meeting
            const filtered = data.filter(
                (s: Speaker) => s.meeting_id === null || s.meeting_id === meetingId
            );
            // Sort: assigned to this meeting first
            filtered.sort((a: Speaker, b: Speaker) => {
                if (a.meeting_id === meetingId && b.meeting_id !== meetingId) return -1;
                if (a.meeting_id !== meetingId && b.meeting_id === meetingId) return 1;
                return 0;
            });
            setSpeakers(filtered);
        }
        setIsLoading(false);
    };

    const filteredSpeakers = speakers.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedSpeaker = speakers.find((s) => s.id === selectedSpeakerId);

    return (
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
                            No speakers found
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
                                    {speaker.meeting_id === meetingId && (
                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                            Assigned
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
                        onClick={() => {
                            onCreateNew();
                            setOpen(false);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Speaker
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
