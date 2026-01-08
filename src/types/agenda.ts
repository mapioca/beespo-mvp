import { Database } from './database';

// Type aliases for convenience
type TemplateItem = Database['public']['Tables']['template_items']['Row'];
type AgendaItem = Database['public']['Tables']['agenda_items']['Row'];

// Helper types for procedural items
export type ProceduralTemplateItem = TemplateItem & {
  item_type: 'procedural';
};

export type ProceduralAgendaItem = AgendaItem & {
  item_type: 'procedural';
  discussion_id: null;
  business_item_id: null;
  announcement_id: null;
};

// Type guards
export function isProceduralTemplateItem(item: TemplateItem): item is ProceduralTemplateItem {
  return item.item_type === 'procedural';
}

export function isProceduralAgendaItem(item: AgendaItem): item is ProceduralAgendaItem {
  return item.item_type === 'procedural';
}

export function isComplexAgendaItem(item: AgendaItem): boolean {
  return item.item_type !== 'procedural';
}

// UI Display helpers
export function getItemTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    procedural: 'Procedural',
    discussion: 'Discussion',
    business: 'Business Item',
    announcement: 'Announcement',
  };
  return labels[type] || type;
}

export function getItemTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    procedural: 'outline',
    discussion: 'default',
    business: 'secondary',
    announcement: 'default',
  };
  return variants[type] || 'outline';
}
