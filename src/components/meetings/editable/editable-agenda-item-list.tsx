"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Music, User } from "lucide-react";
import { InlineInput } from "./inline-input";
import { InlineCombobox, ComboboxOption } from "./inline-combobox";
import { MeetingTypeBadge } from "../meeting-type-badge";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
};

interface EditableAgendaItemListProps {
    items: AgendaItem[];
    meetingId: string;
    isEditable?: boolean;
    onItemsChange?: (items: AgendaItem[]) => void;
}

// Item types that support participant assignment
const PARTICIPANT_ITEM_TYPES = ["procedural", "speaker"];

// Item types that support hymn assignment
const isHymnItem = (item: AgendaItem): boolean => {
    const title = item.title.toLowerCase();
    return (
        item.item_type === "procedural" &&
        (title.includes("hymn") ||
            title.includes("opening song") ||
            title.includes("closing song") ||
            title.includes("sacrament song") ||
            title.includes("rest hymn") ||
            title.includes("intermediate hymn"))
    );
};

// Hymn book logos
const getHymnBookLogo = (bookId: string) => {
    const logos: Record<string, { src: string; alt: string }> = {
        hymns_church: {
            src: "/images/lds-hymns.svg",
            alt: "LDS Hymns",
        },
        hymns_home_church: {
            src: "/images/home-church.svg",
            alt: "Home Church Collection",
        },
    };
    return logos[bookId] || { src: "/images/lds-hymns.svg", alt: "Hymnal" };
};

interface Participant {
    id: string;
    name: string;
}

interface Hymn {
    id: string;
    hymn_number: number;
    title: string;
    book_id: string;
}

interface InlineAgendaRowProps {
    item: AgendaItem;
    isEditable: boolean;
    isUpdating: boolean;
    onUpdate: (
        itemId: string,
        updates: Partial<AgendaItem>,
        optimisticItem: AgendaItem
    ) => Promise<boolean>;
    participants: Participant[];
    hymns: Hymn[];
    onLoadParticipants: () => void;
    onLoadHymns: () => void;
    isLoadingParticipants: boolean;
    isLoadingHymns: boolean;
    onCreateParticipant: (name: string) => Promise<Participant | null>;
}

function InlineAgendaRow({
    item,
    isEditable,
    isUpdating,
    onUpdate,
    participants,
    hymns,
    onLoadParticipants,
    onLoadHymns,
    isLoadingParticipants,
    isLoadingHymns,
    onCreateParticipant,
}: InlineAgendaRowProps) {
    const showParticipant = PARTICIPANT_ITEM_TYPES.includes(item.item_type);
    const showHymn = isHymnItem(item);

    // Convert participants to ComboboxOption
    const participantOptions: ComboboxOption[] = participants.map((p) => ({
        id: p.id,
        label: p.name,
    }));

    // Convert hymns to ComboboxOption
    const hymnOptions: ComboboxOption[] = hymns.map((h) => {
        const logo = getHymnBookLogo(h.book_id);
        return {
            id: h.id,
            label: h.title,
            sublabel: `#${h.hymn_number}`,
            icon: (
                <div className="relative w-5 h-5 shrink-0">
                    <Image
                        src={logo.src}
                        alt={logo.alt}
                        width={20}
                        height={20}
                        className="object-contain"
                    />
                </div>
            ),
        };
    });

    // Current participant as ComboboxOption
    const currentParticipant: ComboboxOption | null = item.participant_id
        ? {
              id: item.participant_id,
              label: item.participant_name || "Unknown",
          }
        : null;

    // Current hymn as ComboboxOption
    const currentHymn: ComboboxOption | null = item.hymn_id && item.hymn
        ? {
              id: item.hymn_id,
              label: item.hymn.title,
              sublabel: `#${item.hymn.hymn_number}`,
          }
        : null;

    // Handle title save
    const handleTitleSave = useCallback(
        async (newTitle: string) => {
            if (!newTitle.trim()) return false;
            const optimisticItem: AgendaItem = { ...item, title: newTitle };
            return onUpdate(item.id, { title: newTitle }, optimisticItem);
        },
        [item, onUpdate]
    );

    // Handle duration save
    const handleDurationSave = useCallback(
        async (newDuration: string) => {
            const duration = parseInt(newDuration) || null;
            const optimisticItem: AgendaItem = {
                ...item,
                duration_minutes: duration,
            };
            return onUpdate(item.id, { duration_minutes: duration }, optimisticItem);
        },
        [item, onUpdate]
    );

    // Handle participant select
    const handleParticipantSelect = useCallback(
        async (option: ComboboxOption | null) => {
            const optimisticItem: AgendaItem = {
                ...item,
                participant_id: option?.id || null,
                participant_name: option?.label || null,
            };
            return onUpdate(
                item.id,
                {
                    participant_id: option?.id || null,
                    participant_name: option?.label || null,
                },
                optimisticItem
            );
        },
        [item, onUpdate]
    );

    // Handle hymn select
    const handleHymnSelect = useCallback(
        async (option: ComboboxOption | null) => {
            const selectedHymn = option
                ? hymns.find((h) => h.id === option.id)
                : null;
            const optimisticItem: AgendaItem = {
                ...item,
                hymn_id: option?.id || null,
                hymn: selectedHymn
                    ? {
                          title: selectedHymn.title,
                          hymn_number: selectedHymn.hymn_number,
                      }
                    : null,
            };
            return onUpdate(item.id, { hymn_id: option?.id || null }, optimisticItem);
        },
        [item, hymns, onUpdate]
    );

    // Handle create new participant
    const handleCreateParticipant = useCallback(
        async (name: string): Promise<ComboboxOption | null> => {
            const newParticipant = await onCreateParticipant(name);
            if (newParticipant) {
                return {
                    id: newParticipant.id,
                    label: newParticipant.name,
                };
            }
            return null;
        },
        [onCreateParticipant]
    );

    return (
        <div
            className={cn(
                "flex gap-4 p-4 rounded-lg border bg-card transition-all",
                item.is_completed && "bg-muted/50 opacity-80",
                isUpdating && "ring-2 ring-primary/20"
            )}
        >
            {/* Order Number */}
            <div className="flex-none pt-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {item.order_index + 1}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow space-y-2 min-w-0">
                {/* Title Row */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Inline Title */}
                            {isEditable ? (
                                <InlineInput
                                    value={item.title}
                                    onSave={handleTitleSave}
                                    placeholder="Enter title..."
                                    disabled={isUpdating}
                                    displayClassName={cn(
                                        "font-medium",
                                        item.is_completed && "line-through text-muted-foreground"
                                    )}
                                />
                            ) : (
                                <span
                                    className={cn(
                                        "font-medium",
                                        item.is_completed && "line-through text-muted-foreground"
                                    )}
                                >
                                    {item.title}
                                </span>
                            )}

                            {/* Inline Duration */}
                            {isEditable ? (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 h-5 font-normal text-muted-foreground inline-flex items-center gap-0.5"
                                >
                                    <Clock className="w-3 h-3" />
                                    <InlineInput
                                        value={item.duration_minutes?.toString() || ""}
                                        onSave={handleDurationSave}
                                        type="number"
                                        placeholder="0"
                                        emptyText="0"
                                        suffix="m"
                                        min={0}
                                        max={999}
                                        disabled={isUpdating}
                                        inputClassName="w-12 h-5 text-[10px]"
                                        displayClassName="text-[10px]"
                                    />
                                </Badge>
                            ) : item.duration_minutes ? (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 h-5 font-normal text-muted-foreground"
                                >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {item.duration_minutes}m
                                </Badge>
                            ) : null}
                        </div>
                        {item.description && (
                            <p className="text-sm text-muted-foreground">
                                {item.description}
                            </p>
                        )}
                    </div>
                    <MeetingTypeBadge type={item.item_type} />
                </div>

                {/* Editable Fields Row */}
                {(showParticipant || showHymn) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                        {/* Participant Selector */}
                        {showParticipant && (
                            <div
                                onMouseEnter={onLoadParticipants}
                                onFocus={onLoadParticipants}
                            >
                                {isEditable ? (
                                    <InlineCombobox
                                        value={currentParticipant}
                                        options={participantOptions}
                                        onSelect={handleParticipantSelect}
                                        onCreateNew={handleCreateParticipant}
                                        placeholder="Assign participant"
                                        emptyText="Assign participant"
                                        searchPlaceholder="Search participants..."
                                        noResultsText="No participants yet"
                                        disabled={isUpdating}
                                        isLoading={isLoadingParticipants}
                                        icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}
                                    />
                                ) : item.participant_name ? (
                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <User className="h-3.5 w-3.5" />
                                        {item.participant_name}
                                    </span>
                                ) : null}
                            </div>
                        )}

                        {/* Hymn Selector */}
                        {showHymn && (
                            <div
                                onMouseEnter={onLoadHymns}
                                onFocus={onLoadHymns}
                            >
                                {isEditable ? (
                                    <InlineCombobox
                                        value={currentHymn}
                                        options={hymnOptions}
                                        onSelect={handleHymnSelect}
                                        placeholder="Select hymn"
                                        emptyText="Select hymn"
                                        searchPlaceholder="Search by number or title..."
                                        noResultsText="No hymns found"
                                        disabled={isUpdating}
                                        isLoading={isLoadingHymns}
                                        icon={<Music className="h-3.5 w-3.5 text-muted-foreground" />}
                                    />
                                ) : item.hymn ? (
                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Music className="h-3.5 w-3.5" />
                                        #{item.hymn.hymn_number} - {item.hymn.title}
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* Notes display */}
                {item.notes && typeof item.notes === "string" && (
                    <div className="mt-2 text-sm bg-yellow-50/50 p-2 rounded border border-yellow-100 dark:bg-yellow-950/10 dark:border-yellow-900/30">
                        <span className="font-medium text-xs text-yellow-700 dark:text-yellow-500 block mb-1">
                            Notes:
                        </span>
                        {item.notes}
                    </div>
                )}
            </div>

            {/* Completion Checkbox */}
            <div className="flex-none pt-1">
                <Checkbox
                    checked={item.is_completed}
                    disabled
                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
            </div>
        </div>
    );
}

export function EditableAgendaItemList({
    items: initialItems,
    isEditable = true,
    onItemsChange,
}: EditableAgendaItemListProps) {
    const [items, setItems] = useState<AgendaItem[]>(initialItems);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [hymns, setHymns] = useState<Hymn[]>([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
    const [isLoadingHymns, setIsLoadingHymns] = useState(false);
    const [participantsLoaded, setParticipantsLoaded] = useState(false);
    const [hymnsLoaded, setHymnsLoaded] = useState(false);
    const { toast } = useToast();

    // Sync with external items changes
    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    // Load participants lazily
    const loadParticipants = useCallback(async () => {
        if (participantsLoaded || isLoadingParticipants) return;

        setIsLoadingParticipants(true);
        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            setIsLoadingParticipants(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) {
            setIsLoadingParticipants(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("participants") as any)
            .select("id, name")
            .eq("workspace_id", profile.workspace_id)
            .order("name");

        if (!error && data) {
            setParticipants(data);
        }
        setParticipantsLoaded(true);
        setIsLoadingParticipants(false);
    }, [participantsLoaded, isLoadingParticipants]);

    // Load hymns lazily
    const loadHymns = useCallback(async () => {
        if (hymnsLoaded || isLoadingHymns) return;

        setIsLoadingHymns(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("hymns") as any)
            .select("id, hymn_number, title, book_id")
            .order("hymn_number");

        if (!error && data) {
            setHymns(data);
        }
        setHymnsLoaded(true);
        setIsLoadingHymns(false);
    }, [hymnsLoaded, isLoadingHymns]);

    // Create new participant
    const createParticipant = useCallback(
        async (name: string): Promise<Participant | null> => {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase.from("profiles") as any)
                .select("workspace_id")
                .eq("id", user.id)
                .single();

            if (!profile?.workspace_id) return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from("participants") as any)
                .insert({
                    name: name.trim(),
                    workspace_id: profile.workspace_id,
                })
                .select()
                .single();

            if (!error && data) {
                // Add to local participants list
                setParticipants((prev) => [...prev, data].sort((a, b) =>
                    a.name.localeCompare(b.name)
                ));
                return data;
            }
            return null;
        },
        []
    );

    // Optimistic update helper
    const updateItem = useCallback(
        async (
            itemId: string,
            updates: Partial<AgendaItem>,
            optimisticItem: AgendaItem
        ): Promise<boolean> => {
            // Optimistic update
            const previousItems = items;
            const newItems = items.map((item) =>
                item.id === itemId ? optimisticItem : item
            );
            setItems(newItems);
            onItemsChange?.(newItems);

            // Persist to database
            setUpdatingItemId(itemId);
            const supabase = createClient();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from("agenda_items") as any)
                .update(updates)
                .eq("id", itemId);

            setUpdatingItemId(null);

            if (error) {
                // Revert on error
                setItems(previousItems);
                onItemsChange?.(previousItems);
                toast({
                    title: "Update failed",
                    description: "Could not save changes. Please try again.",
                    variant: "destructive",
                });
                return false;
            }

            return true;
        },
        [items, onItemsChange, toast]
    );

    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                No agenda items added yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <InlineAgendaRow
                    key={item.id}
                    item={item}
                    isEditable={isEditable}
                    isUpdating={updatingItemId === item.id}
                    onUpdate={updateItem}
                    participants={participants}
                    hymns={hymns}
                    onLoadParticipants={loadParticipants}
                    onLoadHymns={loadHymns}
                    isLoadingParticipants={isLoadingParticipants}
                    isLoadingHymns={isLoadingHymns}
                    onCreateParticipant={createParticipant}
                />
            ))}
        </div>
    );
}
