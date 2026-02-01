// Template builder types

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
}

// Reuse ToolboxItem type from meetings builder
export type { ToolboxItem, ProceduralItemType } from "@/components/meetings/builder/types";
