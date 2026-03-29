"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HymnSelectorPopover } from "./hymn-selector-popover";
import { ParticipantSelectorPopover } from "./participant-selector-popover";
import { SpeakerSelectorPopover, type SpeakerSelection } from "./speaker-selector-popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DiscussionSelectorPopover, type DiscussionSelection } from "./discussion-selector-popover";
import { BusinessSelectorPopover, type BusinessSelection } from "./business-selector-popover";
import { AnnouncementSelectorPopover, type AnnouncementSelection } from "./announcement-selector-popover";
import { CanvasItem } from "./types";

interface ItemPropertiesPanelProps {
    item: CanvasItem;
    onUpdateItem?: (id: string, newTitle: string) => void;
    onUpdateDescription?: (id: string, newDescription: string) => void;
    onUpdateItemNotes?: (id: string, newNotes: string) => void;
    onUpdateDuration?: (id: string, newDuration: number) => void;
    onSelectHymn?: (hymn: { id: string; number: number; title: string }) => void;
    onSelectParticipant?: (participant: { id: string; name: string }) => void;
    onSelectSpeaker?: (speaker: SpeakerSelection) => void;
    selectedSpeakerIdsInMeeting?: string[];
    onAddToContainer?: () => void;
    onRemoveChildItem?: (childId: string) => void;
    onSelectDiscussion?: (discussions: DiscussionSelection[]) => void;
    onSelectBusiness?: (items: BusinessSelection[]) => void;
    onSelectAnnouncement?: (announcements: AnnouncementSelection[]) => void;
}

export function ItemPropertiesPanel({
    item,
    onUpdateItem,
    onUpdateDescription,
    onUpdateItemNotes,
    onUpdateDuration,
    onSelectHymn,
    onSelectParticipant,
    onSelectSpeaker,
    selectedSpeakerIdsInMeeting = [],
    onAddToContainer,
    onRemoveChildItem,
    onSelectDiscussion,
    onSelectBusiness,
    onSelectAnnouncement,
}: ItemPropertiesPanelProps) {
    const [showSacramentPrayers, setShowSacramentPrayers] = useState(false);
    const [sacramentLanguage, setSacramentLanguage] = useState("");
    const [showItemNotes, setShowItemNotes] = useState(false);

    useEffect(() => {
        setShowSacramentPrayers(false);
        setSacramentLanguage("");
        setShowItemNotes(false);
    }, [item.id]);

    return (
        <div className="w-[360px] max-h-[70vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-2 border-b border-border/40">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Item Properties</p>
                <p className="text-[13px] font-medium truncate text-foreground mt-1">
                    {item.structural_type === "section_header" ? (item.title || "Untitled section") : (item.title || "Untitled item")}
                </p>
            </div>

            <div className="p-4 space-y-3">
                {/* Title (all items except dividers) */}
                {item.structural_type !== "divider" && (
                    <div className="space-y-1.5">
                        <Label htmlFor={`item-title-${item.id}`} className="text-xs">
                            {item.structural_type === "section_header" ? "Section Title" : "Title"}
                        </Label>
                        <Input
                            id={`item-title-${item.id}`}
                            value={item.title}
                            onChange={(e) => onUpdateItem?.(item.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="bg-background h-8 text-sm border-border/60 focus-visible:ring-0 focus-visible:border-foreground/30"
                            placeholder="Enter title..."
                        />
                    </div>
                )}

                <div
                    className={cn(
                        "grid gap-3 items-end",
                        !item.structural_type ? "grid-cols-2" : "grid-cols-1"
                    )}
                >
                    {/* Item Type (Read-only) */}
                    <div className="space-y-1.5">
                        <Label className="text-xs">Type</Label>
                        <Input
                            value={item.structural_type?.replace("_", " ") || item.category || "Unknown"}
                            disabled
                            className="bg-muted h-8 text-sm capitalize opacity-70 cursor-not-allowed border-border/40"
                        />
                    </div>

                    {/* Duration (non-structural items only) */}
                    {!item.structural_type && (
                        <div className="space-y-1.5">
                            <Label htmlFor={`item-duration-${item.id}`} className="text-xs">
                                Duration (minutes)
                            </Label>
                            <Input
                                id={`item-duration-${item.id}`}
                                type="number"
                                min={0}
                                max={120}
                                value={item.duration_minutes}
                                onChange={(e) => onUpdateDuration?.(item.id, parseInt(e.target.value) || 0)}
                                className="bg-background h-8 text-sm border-border/60 focus-visible:ring-0 focus-visible:border-foreground/30"
                            />
                        </div>
                    )}
                </div>

                {/* Description/Notes (for items configured with rich text) */}
                {item.config?.has_rich_text && (
                    <div className="space-y-1.5">
                        <Label htmlFor={`item-description-${item.id}`} className="text-xs">
                            Description (Internal)
                        </Label>
                        <textarea
                            id={`item-description-${item.id}`}
                            value={item.description || ""}
                            onChange={(e) => onUpdateDescription?.(item.id, e.target.value)}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Add internal description..."
                        />
                    </div>
                )}

                {/* Item Notes (Global for all items) */}
                {item.structural_type !== "divider" && (
                    <div className="py-2.5 space-y-1.5 border-t">
                        {showItemNotes || item.item_notes ? (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Notes</Label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowItemNotes(false);
                                            onUpdateItemNotes?.(item.id, "");
                                        }}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                </div>
                                <RichTextEditor
                                    content={item.item_notes || ""}
                                    onSave={async (content) => onUpdateItemNotes?.(item.id, content)}
                                />
                            </div>
                        ) : (
                            <div
                                className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors h-7"
                                onClick={() => setShowItemNotes(true)}
                            >
                                <span className="text-sm">Item Notes</span>
                                <Plus className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110 transition-all" />
                            </div>
                        )}
                    </div>
                )}

                {/* Sacrament Prayers (Special case for global_sacrament) */}
                {item.procedural_item_type_id === "global_sacrament" && (
                    <div className="py-2.5">
                        {showSacramentPrayers ? (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Sacrament Prayers</Label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowSacramentPrayers(false);
                                            setSacramentLanguage("");
                                        }}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                </div>
                                <Select
                                    value={sacramentLanguage}
                                    onValueChange={(val) => {
                                        setSacramentLanguage(val);
                                        if (val && onUpdateItemNotes) {
                                            import("@/lib/sacrament-prayers").then((m) => {
                                                onUpdateItemNotes(item.id, m.getSacramentPrayersText(val));
                                                setShowItemNotes(true);
                                            });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="bg-background h-8 text-sm">
                                        <SelectValue placeholder="Select Language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="es">Spanish</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div
                                className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors h-7"
                                onClick={() => setShowSacramentPrayers(true)}
                            >
                                <span className="text-sm">Sacrament Prayers</span>
                                <Plus className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110 transition-all" />
                            </div>
                        )}
                    </div>
                )}

                {/* Hymn selector */}
                {item.is_hymn && (
                    <div className="space-y-1.5">
                        <Label className="text-xs">Musical Resource</Label>
                        <HymnSelectorPopover
                            currentHymnId={item.hymn_id}
                            onSelect={(hymn) => {
                                if (onSelectHymn) {
                                    onSelectHymn(hymn);
                                }
                            }}
                        >
                            <button
                                type="button"
                                className={cn(
                                    "w-full h-8 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                    "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                    item.hymn_title && "border-solid bg-blue-50/50 border-blue-200 text-blue-700 font-medium"
                                )}
                            >
                                <span className="truncate">
                                    {item.hymn_title
                                        ? `#${item.hymn_number} ${item.hymn_title}`
                                        : "Select Hymn..."}
                                </span>
                            </button>
                        </HymnSelectorPopover>
                    </div>
                )}

                {/* Participant selector */}
                {(item.requires_participant || item.config?.requires_assignee) &&
                    item.category !== "speaker" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">Assignable Person</Label>
                            <ParticipantSelectorPopover
                                currentParticipantId={item.participant_id || undefined}
                                onSelect={(p) => onSelectParticipant?.(p)}
                            >
                                <button
                                    type="button"
                                    className={cn(
                                        "w-full h-8 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                        "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                        item.participant_name && "border-solid bg-slate-50/50 border-slate-200 text-slate-700 font-medium"
                                    )}
                                >
                                    <span className="truncate">
                                        {item.participant_name || "Select Participant..."}
                                    </span>
                                </button>
                            </ParticipantSelectorPopover>
                        </div>
                    )}

                {/* Speaker selector */}
                {item.category === "speaker" && (
                    <div className="space-y-1.5">
                        <Label className="text-xs">Speaker</Label>
                        <SpeakerSelectorPopover
                            currentSpeakerId={item.speaker_id || undefined}
                            selectedSpeakerIdsInMeeting={selectedSpeakerIdsInMeeting}
                            onSelect={(speaker) => onSelectSpeaker?.(speaker)}
                        >
                            <button
                                type="button"
                                className={cn(
                                    "w-full h-8 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                    "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                    item.speaker_name && "border-solid bg-indigo-50/50 border-indigo-200 text-indigo-700 font-medium"
                                )}
                            >
                                <span className="truncate">
                                    {item.speaker_name
                                        ? `${item.speaker_name}${item.speaker_topic ? ` — ${item.speaker_topic}` : ""}`
                                        : "Select Speaker..."}
                                </span>
                            </button>
                        </SpeakerSelectorPopover>
                    </div>
                )}

                {/* Container items (Discussion, Business, Announcement) */}
                {item.isContainer && item.containerType && (
                    <div className="space-y-3 pt-2">
                        {/* Children list */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                Items ({item.childItems?.length || 0})
                            </Label>
                            {item.childItems && item.childItems.length > 0 ? (
                                <div className="space-y-1">
                                    {item.childItems.map((child) => (
                                        <div
                                            key={child.id}
                                            className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-background border border-border/60 group/child"
                                        >
                                            <span className="text-xs flex-1 truncate text-foreground">
                                                {child.title}
                                            </span>
                                            {child.status && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground capitalize shrink-0">
                                                    {child.status.replace("_", " ")}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                className="p-0.5 rounded opacity-0 group-hover/child:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => onRemoveChildItem?.(child.id)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-muted-foreground italic py-1">
                                    No items added yet.
                                </p>
                            )}
                        </div>

                        {/* Add item button */}
                        {item.containerType === "discussion" ? (
                            <DiscussionSelectorPopover onSelect={(discs) => onSelectDiscussion?.(discs)}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-8 gap-1.5 text-xs font-normal border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add discussion
                                </Button>
                            </DiscussionSelectorPopover>
                        ) : item.containerType === "business" ? (
                            <BusinessSelectorPopover onSelect={(biz) => onSelectBusiness?.(biz)}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-8 gap-1.5 text-xs font-normal border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add business item
                                </Button>
                            </BusinessSelectorPopover>
                        ) : item.containerType === "announcement" ? (
                            <AnnouncementSelectorPopover onSelect={(ann) => onSelectAnnouncement?.(ann)}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-8 gap-1.5 text-xs font-normal border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add announcement
                                </Button>
                            </AnnouncementSelectorPopover>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-8 gap-1.5 text-xs font-normal border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                                onClick={onAddToContainer}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add {item.containerType}
                            </Button>
                        )}
                    </div>
                )}

                {/* Section header hint */}
                {item.structural_type === "section_header" && (
                    <p className="text-[10px] text-muted-foreground italic pt-2">
                        Use headers to logically group your agenda items.
                    </p>
                )}
            </div>
        </div>
    );
}

export default ItemPropertiesPanel;
