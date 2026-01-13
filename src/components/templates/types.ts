export type AgendaItemType = 'procedural' | 'discussion' | 'business' | 'announcement' | 'speaker';

export interface TemplateItem {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    item_type: 'procedural' | 'discussion' | 'business' | 'announcement' | 'speaker';
    procedural_item_type_id?: string | null;
    hymn_id?: string | null;
    isNew?: boolean;
    is_hymn_type?: boolean;
}
