"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChatCenteredTextIcon,
    BriefcaseIcon,
    MegaphoneIcon,
    UserPlusIcon,
    PlusIcon,
    MicrophoneIcon,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";



interface Discussion {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
}

interface BusinessItem {
    id: string;
    person_name: string;
    position_calling: string | null;
    category: string;
    notes: string | null;
    status: string;
}

interface Announcement {
    id: string;
    title: string;
    content: string | null;
    status: string;
    priority: string;
}

interface Participant {
    id: string;
    name: string;
    created_at: string;
}

interface Speaker {
    id: string;
    name: string;
    topic: string | null;
    is_confirmed: boolean;
}

export type UnifiedSelectorMode =
    | "discussion"
    | "business"
    | "announcement"
    | "participant"
    | "speaker";

// Selection result types
export interface DiscussionSelection {
    id: string;
    title: string;
    description: string | null;
    status: string;
}

export interface BusinessSelection {
    id: string;
    person_name: string;
    position_calling: string | null;
    category: string;
    notes: string | null;
}

export interface AnnouncementSelection {
    id: string;
    title: string;
    description: string | null;
    priority: string;
}

export interface ParticipantSelection {
    id: string;
    name: string;
}

export interface SpeakerSelection {
    id: string;
    name: string;
    topic: string | null;
    is_confirmed: boolean;
}

interface UnifiedSelectorModalProps {
    open: boolean;
    onClose: () => void;
    mode: UnifiedSelectorMode;
    onSelectDiscussion?: (discussion: DiscussionSelection) => void;
    onSelectBusiness?: (business: BusinessSelection) => void;
    onSelectAnnouncement?: (announcement: AnnouncementSelection) => void;
    onSelectParticipant?: (participant: ParticipantSelection) => void;
    onSelectSpeaker?: (speaker: SpeakerSelection) => void;
    // For highlighting current selection
    currentSelectionId?: string;
    // For filtering already-selected items
    excludeIds?: string[];
    // For speaker mode: IDs already selected in this meeting
    selectedSpeakerIdsInMeeting?: string[];
}

export function UnifiedSelectorModal({
    open,
    onClose,
    mode,
    onSelectDiscussion,
    onSelectBusiness,
    onSelectAnnouncement,
    onSelectParticipant,
    onSelectSpeaker,
    currentSelectionId,
    excludeIds = [],
    selectedSpeakerIdsInMeeting = [],
}: UnifiedSelectorModalProps) {
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Data state for each mode
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [businessItems, setBusinessItems] = useState<BusinessItem[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);

    // Create participant state
    const [isCreatingParticipant, setIsCreatingParticipant] = useState(false);
    const [newParticipantName, setNewParticipantName] = useState("");

    // Load data when modal opens
    useEffect(() => {
        if (open) {
            setSearch("");
            setIsCreatingParticipant(false);
            setNewParticipantName("");
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode]);

    const loadData = async () => {
        setIsLoading(true);
        const supabase = createClient();

        try {
            // Get current user's workspace_id for explicit filtering
            const { data: { user } } = await supabase.auth.getUser();
            let workspaceId: string | null = null;

            if (user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase.from("profiles") as any)
                    .select("workspace_id")
                    .eq("id", user.id)
                    .single();
                workspaceId = profile?.workspace_id;
            }

            switch (mode) {
                case "discussion": {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let query = (supabase.from("discussions") as any)
                        .select("id, title, description, status, priority")
                        .in("status", ["new", "active", "decision_required"]);

                    if (workspaceId) {
                        query = query.eq("workspace_id", workspaceId);
                    }

                    const { data, error } = await query.order("created_at", { ascending: false });
                    if (error) console.error("Error loading discussions:", error);
                    if (data) setDiscussions(data);
                    break;
                }
                case "business": {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let query = (supabase.from("business_items") as any)
                        .select("id, person_name, position_calling, category, notes, status")
                        .eq("status", "pending");

                    if (workspaceId) {
                        query = query.eq("workspace_id", workspaceId);
                    }

                    const { data, error } = await query.order("created_at", { ascending: false });
                    if (error) console.error("Error loading business items:", error);
                    if (data) setBusinessItems(data);
                    break;
                }
                case "announcement": {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let query = (supabase.from("announcements") as any)
                        .select("id, title, content, status, priority")
                        .eq("status", "active");

                    if (workspaceId) {
                        query = query.eq("workspace_id", workspaceId);
                    }

                    const { data, error } = await query.order("created_at", { ascending: false });
                    if (error) console.error("Error loading announcements:", error);
                    console.log("Announcements loaded:", data?.length || 0, "items");
                    if (data) setAnnouncements(data);
                    break;
                }
                case "participant": {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let query = (supabase.from("participants") as any)
                        .select("id, name, created_at");

                    if (workspaceId) {
                        query = query.eq("workspace_id", workspaceId);
                    }

                    const { data, error } = await query.order("name");
                    if (error) console.error("Error loading participants:", error);
                    if (data) setParticipants(data);
                    break;
                }
                case "speaker": {
                    // Get all speakers in the workspace
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let query = (supabase.from("speakers") as any)
                        .select("id, name, topic, is_confirmed");

                    if (workspaceId) {
                        query = query.eq("workspace_id", workspaceId);
                    }

                    const { data: allSpeakers, error } = await query.order("name");
                    if (error) console.error("Error loading speakers:", error);

                    if (!allSpeakers) {
                        setSpeakers([]);
                        break;
                    }

                    // Get speakers that are already assigned to existing meetings
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data: assignedSpeakers } = await (supabase.from("agenda_items") as any)
                        .select("speaker_id")
                        .not("speaker_id", "is", null)
                        .not("meeting_id", "is", null);

                    const assignedSpeakerIds = new Set(
                        (assignedSpeakers || []).map((a: { speaker_id: string }) => a.speaker_id)
                    );

                    // Filter out speakers assigned to other meetings
                    // (but keep those selected in current meeting composition)
                    const selectedInMeetingSet = new Set(selectedSpeakerIdsInMeeting);
                    const availableSpeakers = allSpeakers.filter((s: Speaker) =>
                        !assignedSpeakerIds.has(s.id) || selectedInMeetingSet.has(s.id)
                    );

                    setSpeakers(availableSpeakers);
                    break;
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }

        setIsLoading(false);
    };

    // Filter other item types
    const filteredDiscussions = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return discussions.filter((d) => {
            if (excludeIds.includes(d.id)) return false;
            if (!searchLower) return true;
            return d.title.toLowerCase().includes(searchLower);
        });
    }, [discussions, search, excludeIds]);

    const filteredBusiness = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return businessItems.filter((b) => {
            if (excludeIds.includes(b.id)) return false;
            if (!searchLower) return true;
            return b.person_name.toLowerCase().includes(searchLower) ||
                (b.position_calling?.toLowerCase().includes(searchLower));
        });
    }, [businessItems, search, excludeIds]);

    const filteredAnnouncements = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return announcements.filter((a) => {
            if (excludeIds.includes(a.id)) return false;
            if (!searchLower) return true;
            return a.title.toLowerCase().includes(searchLower);
        });
    }, [announcements, search, excludeIds]);

    const filteredParticipants = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return participants.filter((p) => {
            if (excludeIds.includes(p.id)) return false;
            if (!searchLower) return true;
            return p.name.toLowerCase().includes(searchLower);
        });
    }, [participants, search, excludeIds]);

    const filteredSpeakers = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        const selectedInMeetingSet = new Set(selectedSpeakerIdsInMeeting);

        const filtered = speakers.filter((s) => {
            if (excludeIds.includes(s.id)) return false;
            if (!searchLower) return true;
            return s.name.toLowerCase().includes(searchLower) ||
                (s.topic && s.topic.toLowerCase().includes(searchLower));
        });

        // Sort: selected in this meeting first, then by name
        return filtered.sort((a, b) => {
            const aInMeeting = selectedInMeetingSet.has(a.id);
            const bInMeeting = selectedInMeetingSet.has(b.id);
            if (aInMeeting && !bInMeeting) return -1;
            if (!aInMeeting && bInMeeting) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [speakers, search, excludeIds, selectedSpeakerIdsInMeeting]);

    // Create new participant
    const handleCreateParticipant = useCallback(async () => {
        if (!newParticipantName.trim()) return;

        const supabase = createClient();

        // Get current user's workspace_id
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
                name: newParticipantName.trim(),
                workspace_id: profile.workspace_id,
            })
            .select()
            .single();

        if (!error && data) {
            setParticipants((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            onSelectParticipant?.({ id: data.id, name: data.name });
            onClose();
        } else if (error) {
            console.error("Error creating participant:", error);
        }
    }, [newParticipantName, onSelectParticipant, onClose]);

    // Modal title based on mode
    const modalConfig: Record<UnifiedSelectorMode, { title: string; icon: React.ElementType; color: string }> = {
        discussion: { title: "Select Discussion", icon: ChatCenteredTextIcon, color: "text-green-500" },
        business: { title: "Select Business Item", icon: BriefcaseIcon, color: "text-purple-500" },
        announcement: { title: "Select Announcement", icon: MegaphoneIcon, color: "text-orange-500" },
        participant: { title: "Select Participant", icon: UserPlusIcon, color: "text-slate-500" },
        speaker: { title: "Select Speaker", icon: MicrophoneIcon, color: "text-indigo-500" },
    };

    const config = modalConfig[mode];
    const Icon = config.icon;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Icon className={cn("h-5 w-5", config.color)} />
                        {config.title}
                    </DialogTitle>
                </DialogHeader>

                {isCreatingParticipant ? (
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col items-center gap-2 mb-2">
                            <UserPlusIcon size={32} color="#030303" weight="fill" />
                            <h3 className="text-lg font-semibold tracking-tight">Create Participant</h3>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Participant Name</label>
                            <Input
                                value={newParticipantName}
                                onChange={(e) => setNewParticipantName(e.target.value)}
                                placeholder="Enter name..."
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateParticipant();
                                    if (e.key === "Escape") setIsCreatingParticipant(false);
                                }}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsCreatingParticipant(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateParticipant} disabled={!newParticipantName.trim()}>
                                Create
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Command className="border-none" shouldFilter={false}>
                        <CommandInput
                            placeholder={`Search ${mode}s...`}
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList className="max-h-[400px]">
                            {isLoading ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            ) : (
                                <>
                                    {/* Discussions */}
                                    {mode === "discussion" && (
                                        <>
                                            {filteredDiscussions.length === 0 ? (
                                                <CommandEmpty>No discussions found.</CommandEmpty>
                                            ) : (
                                                <CommandGroup heading="Open Discussions">
                                                    {filteredDiscussions.map((disc) => (
                                                        <CommandItem
                                                            key={disc.id}
                                                            value={disc.id}
                                                            onSelect={() => {
                                                                onSelectDiscussion?.({
                                                                    id: disc.id,
                                                                    title: disc.title,
                                                                    description: disc.description,
                                                                    status: disc.status,
                                                                });
                                                                onClose();
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-3 py-2",
                                                                currentSelectionId === disc.id && "bg-accent"
                                                            )}
                                                        >
                                                            <ChatCenteredTextIcon className="h-4 w-4 text-green-500 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium truncate">
                                                                        {disc.title}
                                                                    </span>
                                                                    <StatusBadge status={disc.status} />
                                                                </div>
                                                                {disc.description && (
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {disc.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            )}
                                        </>
                                    )}

                                    {/* Business Items */}
                                    {mode === "business" && (
                                        <>
                                            {filteredBusiness.length === 0 ? (
                                                <CommandEmpty>No business items found.</CommandEmpty>
                                            ) : (
                                                <CommandGroup heading="Pending Business">
                                                    {filteredBusiness.map((item) => (
                                                        <CommandItem
                                                            key={item.id}
                                                            value={item.id}
                                                            onSelect={() => {
                                                                onSelectBusiness?.({
                                                                    id: item.id,
                                                                    person_name: item.person_name,
                                                                    position_calling: item.position_calling,
                                                                    category: item.category,
                                                                    notes: item.notes,
                                                                });
                                                                onClose();
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-3 py-2",
                                                                currentSelectionId === item.id && "bg-accent"
                                                            )}
                                                        >
                                                            <BriefcaseIcon className="h-4 w-4 text-purple-500 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium truncate">
                                                                        {item.person_name}{item.position_calling ? ` - ${item.position_calling}` : ""}
                                                                    </span>
                                                                    <Badge variant="secondary" className="text-xs capitalize">
                                                                        {item.category.replace("_", " ")}
                                                                    </Badge>
                                                                </div>
                                                                {item.notes && (
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {item.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            )}
                                        </>
                                    )}

                                    {/* Announcements */}
                                    {mode === "announcement" && (
                                        <>
                                            {filteredAnnouncements.length === 0 ? (
                                                <CommandEmpty>No announcements found.</CommandEmpty>
                                            ) : (
                                                <CommandGroup heading="Active Announcements">
                                                    {filteredAnnouncements.map((ann) => (
                                                        <CommandItem
                                                            key={ann.id}
                                                            value={ann.id}
                                                            onSelect={() => {
                                                                onSelectAnnouncement?.({
                                                                    id: ann.id,
                                                                    title: ann.title,
                                                                    description: ann.content,
                                                                    priority: ann.priority,
                                                                });
                                                                onClose();
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-3 py-2",
                                                                currentSelectionId === ann.id && "bg-accent"
                                                            )}
                                                        >
                                                            <MegaphoneIcon className="h-4 w-4 text-orange-500 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium truncate">
                                                                        {ann.title}
                                                                    </span>
                                                                    <PriorityBadge priority={ann.priority} />
                                                                </div>
                                                                {ann.content && (
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {ann.content}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            )}
                                        </>
                                    )}

                                    {/* Participants */}
                                    {mode === "participant" && (
                                        <>
                                            <CommandGroup heading="Participants">
                                                {/* Create new option */}
                                                <CommandItem
                                                    onSelect={() => setIsCreatingParticipant(true)}
                                                    className="flex items-center gap-3 py-2 text-primary"
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                    <span className="font-medium">Create new participant</span>
                                                </CommandItem>

                                                {filteredParticipants.map((p) => (
                                                    <CommandItem
                                                        key={p.id}
                                                        value={p.id}
                                                        onSelect={() => {
                                                            onSelectParticipant?.({
                                                                id: p.id,
                                                                name: p.name,
                                                            });
                                                            onClose();
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-3 py-2",
                                                            currentSelectionId === p.id && "bg-accent"
                                                        )}
                                                    >
                                                        <UserPlusIcon className="h-4 w-4 text-slate-500 shrink-0" />
                                                        <span className="font-medium">{p.name}</span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                            {filteredParticipants.length === 0 && search && (
                                                <CommandEmpty>No participants found.</CommandEmpty>
                                            )}
                                        </>
                                    )}

                                    {/* Speakers */}
                                    {mode === "speaker" && (
                                        <>
                                            {filteredSpeakers.length === 0 ? (
                                                <CommandEmpty>No available speakers found.</CommandEmpty>
                                            ) : (
                                                <CommandGroup heading="Available Speakers">
                                                    {filteredSpeakers.map((speaker) => {
                                                        const isInMeeting = selectedSpeakerIdsInMeeting.includes(speaker.id);
                                                        return (
                                                            <CommandItem
                                                                key={speaker.id}
                                                                value={speaker.id}
                                                                onSelect={() => {
                                                                    onSelectSpeaker?.({
                                                                        id: speaker.id,
                                                                        name: speaker.name,
                                                                        topic: speaker.topic,
                                                                        is_confirmed: speaker.is_confirmed,
                                                                    });
                                                                    onClose();
                                                                }}
                                                                className={cn(
                                                                    "flex items-center gap-3 py-2",
                                                                    currentSelectionId === speaker.id && "bg-accent"
                                                                )}
                                                            >
                                                                <MicrophoneIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium truncate">
                                                                            {speaker.name}
                                                                        </span>
                                                                        {isInMeeting && currentSelectionId !== speaker.id && (
                                                                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                                                                In this meeting
                                                                            </Badge>
                                                                        )}
                                                                        {!speaker.is_confirmed && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                Unconfirmed
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {speaker.topic && (
                                                                        <p className="text-xs text-muted-foreground truncate">
                                                                            {speaker.topic}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </CommandList>
                    </Command>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Helper components
function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        new: "bg-blue-100 text-blue-700",
        active: "bg-green-100 text-green-700",
        decision_required: "bg-amber-100 text-amber-700",
    };
    return (
        <Badge variant="secondary" className={cn("text-xs", colors[status] || "")}>
            {status.replace("_", " ")}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        high: "bg-red-100 text-red-700",
        medium: "bg-amber-100 text-amber-700",
        low: "bg-slate-100 text-slate-700",
    };
    return (
        <Badge variant="secondary" className={cn("text-xs", colors[priority] || "")}>
            {priority}
        </Badge>
    );
}
