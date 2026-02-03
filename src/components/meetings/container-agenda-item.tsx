"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    GripVertical,
    ChevronDown,
    ChevronRight,
    Plus,
    X,
    MessageSquare,
    Briefcase,
    Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ContainerType = "discussion" | "business" | "announcement";

export interface ContainerChildItem {
    id: string;
    title: string;
    description?: string | null;
    // For discussions
    discussion_id?: string;
    status?: string;
    // For business items
    business_item_id?: string;
    business_type?: string;
    // For conducting script generation
    person_name?: string;
    position_calling?: string;
    business_category?: string;
    business_details?: {
        gender?: "male" | "female";
        office?: string;
        priesthood?: string;
        customScript?: string;
    } | null;
    // For announcements
    announcement_id?: string;
    priority?: string;
}

interface ContainerAgendaItemProps {
    id: string;
    title: string;
    containerType: ContainerType;
    duration_minutes: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    childItems: ContainerChildItem[];
    onAddChild: () => void;
    onRemoveChild: (childId: string) => void;
}

export function ContainerAgendaItem({
    title,
    containerType,
    duration_minutes,
    isExpanded,
    onToggleExpand,
    childItems,
    onAddChild,
    onRemoveChild,
}: ContainerAgendaItemProps) {
    const containerConfig = {
        discussion: {
            icon: MessageSquare,
            color: "text-green-500",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
        },
        business: {
            icon: Briefcase,
            color: "text-purple-500",
            bgColor: "bg-purple-50",
            borderColor: "border-purple-200",
        },
        announcement: {
            icon: Megaphone,
            color: "text-orange-500",
            bgColor: "bg-orange-50",
            borderColor: "border-orange-200",
        },
    };

    const config = containerConfig[containerType];
    const Icon = config.icon;

    return (
        <div className={cn("border rounded-lg overflow-hidden", config.borderColor)}>
            {/* Container header */}
            <div
                className={cn(
                    "flex items-center gap-2 p-3 cursor-pointer transition-colors",
                    config.bgColor,
                    "hover:opacity-90"
                )}
                onClick={onToggleExpand}
            >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                <div className="shrink-0">
                    <Icon className={cn("h-4 w-4", config.color)} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{title}</span>
                        <Badge variant="secondary" className="text-xs">
                            {childItems.length} {childItems.length === 1 ? "item" : "items"}
                        </Badge>
                    </div>
                </div>

                <span className="text-xs text-muted-foreground shrink-0">
                    {duration_minutes}m
                </span>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddChild();
                    }}
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <div className="shrink-0">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Expanded child items */}
            {isExpanded && (
                <div className="border-t divide-y">
                    {childItems.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No items. Click + to add.
                        </div>
                    ) : (
                        childItems.map((child) => (
                            <ChildItem
                                key={child.id}
                                item={child}
                                containerType={containerType}
                                onRemove={() => onRemoveChild(child.id)}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// Child item component
function ChildItem({
    item,
    containerType,
    onRemove,
}: {
    item: ContainerChildItem;
    containerType: ContainerType;
    onRemove: () => void;
}) {
    const containerConfig = {
        discussion: {
            icon: MessageSquare,
            color: "text-green-500",
        },
        business: {
            icon: Briefcase,
            color: "text-purple-500",
        },
        announcement: {
            icon: Megaphone,
            color: "text-orange-500",
        },
    };

    const config = containerConfig[containerType];
    const Icon = config.icon;

    return (
        <div className="flex items-center gap-2 p-3 pl-10 bg-card hover:bg-accent/30 transition-colors group">
            <div className="shrink-0">
                <Icon className={cn("h-4 w-4", config.color)} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm truncate">{item.title}</span>
                    {containerType === "discussion" && item.status && (
                        <StatusBadge status={item.status} />
                    )}
                    {containerType === "business" && item.business_type && (
                        <Badge variant="secondary" className="text-xs">
                            {item.business_type}
                        </Badge>
                    )}
                    {containerType === "announcement" && item.priority && (
                        <PriorityBadge priority={item.priority} />
                    )}
                </div>
                {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.description}
                    </p>
                )}
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onRemove}
            >
                <X className="h-4 w-4 text-muted-foreground" />
            </Button>
        </div>
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
