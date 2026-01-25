import { Database } from "@/types/database";

/** Child item stored in the child_items JSONB column */
export interface StoredChildItem {
    title: string;
    description?: string | null;
    discussion_id?: string | null;
    business_item_id?: string | null;
    announcement_id?: string | null;
}

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
    child_items?: StoredChildItem[] | null;
};

// Types that can be grouped when sequential
const GROUPABLE_TYPES = ["announcement", "business", "discussion"] as const;
type GroupableType = (typeof GROUPABLE_TYPES)[number];

export interface AgendaGroup {
    type: "group";
    groupType: GroupableType;
    title: string;
    duration_minutes: number;
    items: AgendaItem[];
    /** Virtual ID for dnd-kit (uses first item's ID) */
    id: string;
    /** First item's order_index for sorting */
    order_index: number;
}

export interface SingleAgendaItem {
    type: "item";
    item: AgendaItem;
}

/** A container with pre-stored child items (from the meeting builder) */
export interface StoredContainer {
    type: "container";
    containerType: GroupableType;
    title: string;
    duration_minutes: number;
    id: string;
    order_index: number;
    childItems: StoredChildItem[];
    /** The original agenda item for reference */
    originalItem: AgendaItem;
}

export type GroupedAgendaEntry = AgendaGroup | SingleAgendaItem | StoredContainer;

/**
 * Get the pluralized display title for a groupable type
 */
function getGroupTitle(itemType: GroupableType): string {
    switch (itemType) {
        case "announcement":
            return "Announcements";
        case "business":
            return "Ward Business";
        case "discussion":
            return "Discussions";
        default:
            return itemType;
    }
}

/**
 * Check if an item type is groupable
 */
function isGroupableType(itemType: string): itemType is GroupableType {
    return GROUPABLE_TYPES.includes(itemType as GroupableType);
}

/**
 * Check if an item has stored child items (is a container from the meeting builder)
 */
function hasStoredChildren(item: AgendaItem): boolean {
    return Array.isArray(item.child_items) && item.child_items.length > 0;
}

/**
 * Transform a flat list of agenda items into a grouped structure.
 * Sequential items of the same groupable type are bundled together.
 * Items with child_items are treated as stored containers and not auto-grouped.
 */
export function groupAgendaItems(items: AgendaItem[]): GroupedAgendaEntry[] {
    if (items.length === 0) return [];

    // Sort by order_index first
    const sorted = [...items].sort((a, b) => a.order_index - b.order_index);

    const result: GroupedAgendaEntry[] = [];
    let currentGroup: AgendaItem[] = [];
    let currentGroupType: GroupableType | null = null;

    const flushGroup = () => {
        if (currentGroup.length === 0 || !currentGroupType) return;

        if (currentGroup.length === 1) {
            // Single item - don't group
            result.push({ type: "item", item: currentGroup[0] });
        } else {
            // Multiple items - create group
            result.push({
                type: "group",
                groupType: currentGroupType,
                title: getGroupTitle(currentGroupType),
                // Use the duration of the first item as the group's time-box
                duration_minutes: currentGroup[0].duration_minutes || 5,
                items: currentGroup,
                id: `group-${currentGroup[0].id}`,
                order_index: currentGroup[0].order_index,
            });
        }
        currentGroup = [];
        currentGroupType = null;
    };

    for (const item of sorted) {
        // Check if this item has stored children (a container from the meeting builder)
        if (hasStoredChildren(item) && isGroupableType(item.item_type)) {
            // Flush any current auto-group first
            flushGroup();
            // Add as a stored container
            result.push({
                type: "container",
                containerType: item.item_type,
                title: getGroupTitle(item.item_type),
                duration_minutes: item.duration_minutes || 5,
                id: `container-${item.id}`,
                order_index: item.order_index,
                childItems: item.child_items as StoredChildItem[],
                originalItem: item,
            });
        } else if (isGroupableType(item.item_type)) {
            // Groupable item (without stored children)
            if (currentGroupType === item.item_type) {
                // Same type as current group - add to it
                currentGroup.push(item);
            } else {
                // Different type - flush current and start new
                flushGroup();
                currentGroupType = item.item_type;
                currentGroup.push(item);
            }
        } else {
            // Non-groupable item - flush any current group and add as single
            flushGroup();
            result.push({ type: "item", item });
        }
    }

    // Flush any remaining group
    flushGroup();

    return result;
}

/**
 * Calculate total duration from grouped agenda entries.
 * Groups and containers use their fixed duration, not the sum of children.
 */
export function calculateGroupedDuration(entries: GroupedAgendaEntry[]): number {
    return entries.reduce((total, entry) => {
        if (entry.type === "group" || entry.type === "container") {
            // Use the group's/container's fixed time-box duration
            return total + entry.duration_minutes;
        } else {
            // Use the item's duration
            return total + (entry.item.duration_minutes || 0);
        }
    }, 0);
}

/**
 * Calculate total duration directly from items using grouping logic.
 * Convenience function that groups first, then calculates.
 */
export function calculateTotalDurationWithGrouping(items: AgendaItem[]): number {
    const grouped = groupAgendaItems(items);
    return calculateGroupedDuration(grouped);
}

/**
 * Get all item IDs from a grouped structure (for dnd-kit)
 */
export function getGroupedItemIds(entries: GroupedAgendaEntry[]): string[] {
    return entries.map((entry) => {
        if (entry.type === "group" || entry.type === "container") {
            return entry.id;
        }
        return entry.item.id;
    });
}

/**
 * Flatten grouped entries back to items (for reordering)
 */
export function flattenGroupedEntries(entries: GroupedAgendaEntry[]): AgendaItem[] {
    const result: AgendaItem[] = [];
    for (const entry of entries) {
        if (entry.type === "group") {
            result.push(...entry.items);
        } else if (entry.type === "container") {
            // Stored containers are single items with child_items
            result.push(entry.originalItem);
        } else {
            result.push(entry.item);
        }
    }
    return result;
}
