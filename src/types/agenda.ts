import { Database } from './database';

// Type aliases for convenience
type TemplateItem = Database['public']['Tables']['template_items']['Row'];
type AgendaItem = Database['public']['Tables']['agenda_items']['Row'];

// Procedural item types
export type ProceduralItemType = Database['public']['Tables']['procedural_item_types']['Row'];

export interface HymnSelection {
  hymn_number: number;
  hymn_title: string;
  procedural_item_type_id: string;
}

// Specialized component item types (only these are singletons now)
export type SpecializedItemType = 'discussion' | 'announcement' | 'business' | 'speaker';

// Singleton types (Speaker is NO LONGER a singleton - can have multiple)
export const SINGLETON_TYPES: Exclude<SpecializedItemType, 'speaker'>[] = [
  'discussion',
  'announcement',
  'business',
];

export const SPECIALIZED_ITEM_TYPES: SpecializedItemType[] = [
  'discussion',
  'announcement',
  'business',
  'speaker',
];

// Helper types for procedural items
export type ProceduralTemplateItem = TemplateItem & {
  item_type: 'procedural';
};

export type ProceduralAgendaItem = AgendaItem & {
  item_type: 'procedural';
  discussion_id: null;
  business_item_id: null;
  announcement_id: null;
  speaker_id: null;
};

// Helper types for specialized components
export type SpecializedTemplateItem = TemplateItem & {
  item_type: SpecializedItemType;
};

export type SpecializedAgendaItem = AgendaItem & {
  item_type: SpecializedItemType;
};

// Type guards
export function isProceduralTemplateItem(item: TemplateItem): item is ProceduralTemplateItem {
  return item.item_type === 'procedural';
}

export function isProceduralAgendaItem(item: AgendaItem): item is ProceduralAgendaItem {
  return item.item_type === 'procedural';
}

export function isSpecializedTemplateItem(item: TemplateItem): item is SpecializedTemplateItem {
  return SPECIALIZED_ITEM_TYPES.includes(item.item_type as SpecializedItemType);
}

export function isSpecializedAgendaItem(item: AgendaItem): item is SpecializedAgendaItem {
  return SPECIALIZED_ITEM_TYPES.includes(item.item_type as SpecializedItemType);
}

export function isComplexAgendaItem(item: AgendaItem): boolean {
  return item.item_type !== 'procedural';
}

// Singleton validation helper (Speaker is NOT in this list)
export function canAddSpecializedItem(
  existingItems: TemplateItem[],
  itemType: SpecializedItemType
): boolean {
  // Speaker can be added multiple times
  if (itemType === 'speaker') return true;

  // Check if this singleton specialized type already exists in the template
  return !existingItems.some((item) => item.item_type === itemType);
}

// Get already-added specialized types (excluding Speaker from singleton check)
export function getAddedSpecializedTypes(items: TemplateItem[]): Set<SpecializedItemType> {
  const addedTypes = new Set<SpecializedItemType>();
  items.forEach((item) => {
    if (isSpecializedTemplateItem(item) && item.item_type !== 'speaker') {
      addedTypes.add(item.item_type);
    }
  });
  return addedTypes;
}

// UI Display helpers
export function getItemTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    procedural: 'Procedural',
    discussion: 'Discussion',
    business: 'Business Item',
    announcement: 'Announcement',
    speaker: 'Speaker',
  };
  return labels[type] || type;
}

// Updated to use monochrome palette (black/white/gray only)
export function getItemTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'outline' {
  // All badges now use monochrome palette
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    procedural: 'outline',      // Gray background / Black text
    discussion: 'secondary',    // Gray background / Black text
    business: 'secondary',      // Gray background / Black text
    announcement: 'secondary',  // Gray background / Black text
    speaker: 'default',         // Black background / White text
  };
  return variants[type] || 'outline';
}

// Get icon for item type (for Linktree-style modal)
export function getItemTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    procedural: 'List',
    discussion: 'MessageSquare',
    business: 'Briefcase',
    announcement: 'Megaphone',
    speaker: 'User',
  };
  return icons[type] || 'Circle';
}

// Get description for item type (for UI tooltips)
export function getItemTypeDescription(type: SpecializedItemType): string {
  const descriptions: Record<SpecializedItemType, string> = {
    discussion: 'Add a discussion topic slot (max 1 per template)',
    announcement: 'Add an announcements slot (max 1 per template)',
    business: 'Add a business items slot (max 1 per template)',
    speaker: 'Add a speaker assignment slot (can add multiple)',
  };
  return descriptions[type];
}
