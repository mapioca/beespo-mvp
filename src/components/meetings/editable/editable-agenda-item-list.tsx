"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Music, User } from "lucide-react";
import { ParticipantPopover } from "./participant-popover";
import { HymnPopover, HymnSelection } from "./hymn-popover";
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

// Item types that support hymn assignment (typically procedural items with hymn in title)
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

export function EditableAgendaItemList({
    items: initialItems,
    isEditable = true,
    onItemsChange,
}: EditableAgendaItemListProps) {
    const [items, setItems] = useState<AgendaItem[]>(initialItems);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const { toast } = useToast();

    // Optimistic update helper
    const updateItem = useCallback(
        async (
            itemId: string,
            updates: Partial<AgendaItem>,
            optimisticItem: AgendaItem
        ) => {
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

            toast({
                title: "Updated",
                description: "Agenda item updated successfully.",
            });
            return true;
        },
        [items, onItemsChange, toast]
    );

    // Handle participant selection
    const handleParticipantSelect = useCallback(
        async (
            itemId: string,
            participant: { id: string; name: string } | null
        ) => {
            const item = items.find((i) => i.id === itemId);
            if (!item) return;

            const optimisticItem: AgendaItem = {
                ...item,
                participant_id: participant?.id || null,
                participant_name: participant?.name || null,
            };

            await updateItem(
                itemId,
                {
                    participant_id: participant?.id || null,
                    participant_name: participant?.name || null,
                },
                optimisticItem
            );
        },
        [items, updateItem]
    );

    // Handle hymn selection
    const handleHymnSelect = useCallback(
        async (itemId: string, hymn: HymnSelection | null) => {
            const item = items.find((i) => i.id === itemId);
            if (!item) return;

            const optimisticItem: AgendaItem = {
                ...item,
                hymn_id: hymn?.id || null,
                hymn: hymn
                    ? { title: hymn.title, hymn_number: hymn.number }
                    : null,
            };

            await updateItem(
                itemId,
                {
                    hymn_id: hymn?.id || null,
                },
                optimisticItem
            );
        },
        [items, updateItem]
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
            {items.map((item) => {
                const isUpdating = updatingItemId === item.id;
                const showParticipant = PARTICIPANT_ITEM_TYPES.includes(item.item_type);
                const showHymn = isHymnItem(item);

                return (
                    <div
                        key={item.id}
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
                                <div className="space-y-1 min-w-0">
                                    <div className="font-medium leading-none flex items-center gap-2 flex-wrap">
                                        <span
                                            className={
                                                item.is_completed
                                                    ? "line-through text-muted-foreground"
                                                    : ""
                                            }
                                        >
                                            {item.title}
                                        </span>
                                        {item.duration_minutes && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] px-1 h-5 font-normal text-muted-foreground"
                                            >
                                                <Clock className="w-3 h-3 mr-1" />
                                                {item.duration_minutes}m
                                            </Badge>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                                <MeetingTypeBadge type={item.item_type} />
                            </div>

                            {/* Editable Fields */}
                            {isEditable && (showParticipant || showHymn) && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {/* Participant Selector */}
                                    {showParticipant && (
                                        <ParticipantPopover
                                            currentParticipantId={item.participant_id}
                                            currentParticipantName={item.participant_name}
                                            onSelect={(p) =>
                                                handleParticipantSelect(item.id, p)
                                            }
                                            disabled={isUpdating}
                                        />
                                    )}

                                    {/* Hymn Selector */}
                                    {showHymn && (
                                        <HymnPopover
                                            currentHymnId={item.hymn_id}
                                            currentHymnTitle={item.hymn?.title}
                                            currentHymnNumber={item.hymn?.hymn_number}
                                            onSelect={(h) =>
                                                handleHymnSelect(item.id, h)
                                            }
                                            disabled={isUpdating}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Read-only display for non-editable mode */}
                            {!isEditable && (
                                <div className="flex flex-wrap gap-3 text-sm pt-1">
                                    {item.participant_name && (
                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />
                                            {item.participant_name}
                                        </span>
                                    )}
                                    {item.hymn && (
                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                            <Music className="h-3.5 w-3.5" />
                                            #{item.hymn.hymn_number} - {item.hymn.title}
                                        </span>
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
            })}
        </div>
    );
}
