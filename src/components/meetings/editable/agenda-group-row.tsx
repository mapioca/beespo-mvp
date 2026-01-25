"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Clock,
    ChevronDown,
    ChevronRight,
    Plus,
    GripVertical,
    Megaphone,
    Briefcase,
    MessageSquare,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { AgendaGroup, StoredContainer, StoredChildItem } from "@/lib/agenda-grouping";
import { Database } from "@/types/database";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
};

interface AgendaGroupRowProps {
    /** Auto-grouped items (from sequential items of same type) */
    group?: AgendaGroup;
    /** Stored container (from meeting builder with child_items) */
    container?: StoredContainer;
    isEditable: boolean;
    onAddToGroup: (groupType: string) => void;
    /** Render function for auto-grouped AgendaItem children */
    renderChildItem?: (item: AgendaItem) => React.ReactNode;
    /** Render function for stored container children */
    renderStoredChildItem?: (childItem: StoredChildItem, index: number) => React.ReactNode;
}

const GROUP_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
    announcement: {
        bg: "bg-orange-50/50 dark:bg-orange-950/20",
        border: "border-orange-200/50 dark:border-orange-900/30",
        icon: <Megaphone className="h-4 w-4" />,
        iconColor: "text-orange-600 dark:text-orange-400",
    },
    business: {
        bg: "bg-purple-50/50 dark:bg-purple-950/20",
        border: "border-purple-200/50 dark:border-purple-900/30",
        icon: <Briefcase className="h-4 w-4" />,
        iconColor: "text-purple-600 dark:text-purple-400",
    },
    discussion: {
        bg: "bg-green-50/50 dark:bg-green-950/20",
        border: "border-green-200/50 dark:border-green-900/30",
        icon: <MessageSquare className="h-4 w-4" />,
        iconColor: "text-green-600 dark:text-green-400",
    },
};

export function AgendaGroupRow({
    group,
    container,
    isEditable,
    onAddToGroup,
    renderChildItem,
    renderStoredChildItem,
}: AgendaGroupRowProps) {
    const [isOpen, setIsOpen] = useState(true);

    // Use either group or container data
    const isContainer = !!container;
    const entryId = group?.id || container?.id || "";
    const entryType = group?.groupType || container?.containerType || "announcement";
    const entryTitle = group?.title || container?.title || "";
    const entryDuration = group?.duration_minutes || container?.duration_minutes || 5;
    const itemCount = group?.items.length || container?.childItems.length || 0;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: entryId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const groupStyle = GROUP_STYLES[entryType] || GROUP_STYLES.announcement;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "rounded-lg border transition-all",
                groupStyle.bg,
                groupStyle.border,
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
            )}
        >
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                {/* Group Header */}
                <div className="flex items-center gap-2 p-3">
                    {/* Drag Handle */}
                    {isEditable && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="flex-none cursor-grab active:cursor-grabbing touch-none"
                        >
                            <GripVertical className="w-5 h-5 text-muted-foreground/50 hover:text-muted-foreground" />
                        </div>
                    )}

                    {/* Collapse Toggle */}
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>

                    {/* Icon */}
                    <div className={cn("flex-none", groupStyle.iconColor)}>
                        {groupStyle.icon}
                    </div>

                    {/* Title + Count */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm">{entryTitle}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                        </Badge>
                    </div>

                    {/* Duration (Time Box) */}
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 h-5 font-normal text-muted-foreground shrink-0"
                    >
                        <Clock className="w-3 h-3 mr-1" />
                        {entryDuration}m
                    </Badge>

                    {/* Add to Group Button - only show for auto-grouped items, not stored containers */}
                    {isEditable && !isContainer && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => onAddToGroup(entryType)}
                            title={`Add ${entryType}`}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Group Content (Children) */}
                <CollapsibleContent>
                    <div className="px-3 pb-3">
                        <div className="space-y-2 pl-8 border-l-2 border-muted/50 ml-4">
                            {/* Render auto-grouped items */}
                            {group && renderChildItem && group.items.map((item) => (
                                <div key={item.id} className="relative">
                                    {/* Connecting line dot */}
                                    <div className="absolute -left-[9px] top-4 w-2 h-2 rounded-full bg-muted-foreground/30" />
                                    {renderChildItem(item)}
                                </div>
                            ))}
                            {/* Render stored container children */}
                            {container && renderStoredChildItem && container.childItems.map((childItem, index) => (
                                <div key={index} className="relative">
                                    {/* Connecting line dot */}
                                    <div className="absolute -left-[9px] top-4 w-2 h-2 rounded-full bg-muted-foreground/30" />
                                    {renderStoredChildItem(childItem, index)}
                                </div>
                            ))}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
