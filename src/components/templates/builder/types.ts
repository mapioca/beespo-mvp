// Template builder types

import { ContainerType } from "@/components/meetings/container-agenda-item";

// Item behavior configuration (shared with meetings builder)
export interface ItemConfig {
    requires_assignee: boolean;
    requires_resource: boolean;
    has_rich_text: boolean;
}

export interface TemplateCanvasItem {
    id: string;
    category: string;
    title: string;
    description?: string | null;
    duration_minutes: number;
    order_index: number;
    procedural_item_type_id?: string;
    is_hymn?: boolean;
    isNew?: boolean;
    // Container support
    isContainer?: boolean;
    containerType?: ContainerType;
    // Config-driven fields for helper text
    config?: ItemConfig;
    requires_participant?: boolean;
    is_core?: boolean;
    is_custom?: boolean;
}

// Reuse ToolboxItem type from meetings builder
export type { ToolboxItem, ProceduralItemType } from "@/components/meetings/builder/types";
