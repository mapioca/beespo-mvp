"use client";

import { CategoryType } from "../add-meeting-item-dialog";
import { ContainerChildItem, ContainerType } from "../container-agenda-item";

// Item behavior configuration
export interface ItemConfig {
    requires_assignee: boolean;
    requires_resource: boolean;
    has_rich_text: boolean;
}

// Toolbox item that can be dragged onto the canvas
export interface ToolboxItem {
    id: string;
    type: "procedural" | "container" | "speaker" | "structural";
    category: CategoryType;
    title: string;
    description?: string | null;
    duration_minutes: number;
    procedural_item_type_id?: string;
    is_hymn?: boolean;
    requires_participant?: boolean;
    containerType?: ContainerType;
    // New config-driven fields
    config?: ItemConfig;
    is_core?: boolean;
    is_custom?: boolean;
    icon?: string | null;
    structural_type?: "section_header" | "divider";
}

// Canvas item that is on the agenda
export interface CanvasItem {
    id: string;
    category: CategoryType;
    title: string;
    description?: string | null;
    duration_minutes: number;
    order_index: number;
    // Type-specific IDs
    procedural_item_type_id?: string;
    discussion_id?: string;
    business_item_id?: string;
    announcement_id?: string;
    speaker_id?: string;
    structural_type?: "section_header" | "divider";
    // Hymn selection
    is_hymn?: boolean;
    hymn_id?: string;
    hymn_number?: number;
    hymn_title?: string;
    // Speaker details
    speaker_name?: string;
    // Container support
    isContainer?: boolean;
    containerType?: ContainerType;
    childItems?: ContainerChildItem[];
    // Participant assignment
    participant_id?: string;
    participant_name?: string;
    requires_participant?: boolean;
    // Status for display
    status?: string;
    business_type?: string;
    priority?: string;
    // Config-driven fields (from ToolboxItem)
    config?: ItemConfig;
    is_core?: boolean;
    is_custom?: boolean;
    icon?: string | null;
}

// DnD payload types
export interface DragPayload {
    type: "toolbox_item" | "canvas_item";
    item: ToolboxItem | CanvasItem;
    sourceIndex?: number;
}

// Template for dropdown
export interface Template {
    id: string;
    name: string;
    description: string | null;
}

// Procedural item type from DB
export interface ProceduralItemType {
    id: string;
    name: string;
    description: string | null;
    default_duration_minutes: number | null;
    is_hymn: boolean | null;
    order_hint: number | null;
    // New config fields
    requires_assignee: boolean | null;
    requires_resource: boolean | null;
    has_rich_text: boolean | null;
    is_core: boolean | null;
    is_custom: boolean | null;
    workspace_id: string | null;
    icon: string | null;
}

// Category groups for toolbox
export const TOOLBOX_CATEGORIES = {
    worship: {
        label: "Worship",
        items: ["Opening Hymn", "Sacrament Hymn", "Intermediate Hymn", "Closing Hymn", "Rest Hymn"],
    },
    procedural: {
        label: "Procedural",
        items: ["Opening Prayer", "Closing Prayer", "Presiding", "Conducting", "Invocation", "Benediction"],
    },
    business: {
        label: "Business",
        items: ["Ward Business", "Stake Business", "Announcements"],
    },
    speakers: {
        label: "Speakers",
        items: ["Speaker", "Youth Speaker", "High Council Speaker", "Returning Missionary"],
    },
    special: {
        label: "Special",
        items: ["Spiritual Thought", "Testimony", "Musical Number", "Scripture Reading"],
    },
} as const;
