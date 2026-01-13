/**
 * Template Helper Functions
 * Utilities for template scoping, auto-linking, and content filtering
 */

import { createClient } from '@/lib/supabase/server';
import type { SpecializedItemType } from '@/types/agenda';

/**
 * Get items eligible for auto-linking to a specific template
 * Filters by template associations and availability
 */
export async function getEligibleItemsForTemplate(
    templateId: string,
    itemType: SpecializedItemType,
    workspaceId: string
) {
    const supabase = await createClient();

    if (itemType === 'discussion') {
        // Get discussions scoped to this template OR no template (global)
        const { data, error } = await supabase
            .from('discussions')
            .select(`
        *,
        discussion_templates!left(template_id)
      `)
            .eq('workspace_id', workspaceId)
            .eq('status', 'active');

        if (error) throw error;

        // Filter: either has no template associations (global) OR is associated with this template
        return data?.filter((discussion) => {
            const templates = discussion.discussion_templates || [];
            return templates.length === 0 || templates.some((dt: any) => dt.template_id === templateId);
        });
    }

    if (itemType === 'announcement') {
        const { data, error } = await supabase
            .from('announcements')
            .select(`
        *,
        announcement_templates!left(template_id)
      `)
            .eq('workspace_id', workspaceId)
            .eq('status', 'active')
            .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`);

        if (error) throw error;

        return data?.filter((announcement) => {
            const templates = announcement.announcement_templates || [];
            return templates.length === 0 || templates.some((at: any) => at.template_id === templateId);
        });
    }

    if (itemType === 'business') {
        const { data, error } = await supabase
            .from('business_items')
            .select(`
        *,
        business_templates!left(template_id)
      `)
            .eq('workspace_id', workspaceId)
            .eq('status', 'pending');

        if (error) throw error;

        return data?.filter((business) => {
            const templates = business.business_templates || [];
            return templates.length === 0 || templates.some((bt: any) => bt.template_id === templateId);
        });
    }

    if (itemType === 'speaker') {
        const { data, error } = await supabase
            .from('speakers')
            .select(`
        *,
        speaker_templates!left(template_id),
        profile:profiles(full_name)
      `)
            .eq('workspace_id', workspaceId)
            .eq('status', 'confirmed')
            .is('assigned_meeting_id', null); // Not yet assigned

        if (error) throw error;

        return data?.filter((speaker) => {
            const templates = speaker.speaker_templates || [];
            return templates.length === 0 || templates.some((st: any) => st.template_id === templateId);
        });
    }

    return [];
}

/**
 * Auto-link eligible items to agenda
 * Returns the IDs of linked items for each type
 */
export async function autoLinkItems(
    meetingId: string,
    templateId: string,
    workspaceId: string,
    agendaItems: any[]
) {
    const supabase = await createClient();
    const linkedItems: Record<SpecializedItemType, string[]> = {
        discussion: [],
        announcement: [],
        business: [],
        speaker: [],
    };

    // Find slots in agenda for each specialized type
    const discussionSlot = agendaItems.find((item) => item.item_type === 'discussion');
    const announcementSlot = agendaItems.find((item) => item.item_type === 'announcement');
    const businessSlot = agendaItems.find((item) => item.item_type === 'business');
    const speakerSlot = agendaItems.find((item) => item.item_type === 'speaker');

    // Auto-link discussions
    if (discussionSlot) {
        const discussions = await getEligibleItemsForTemplate(templateId, 'discussion', workspaceId);
        if (discussions && discussions.length > 0) {
            // Link the first available discussion
            const discussion = discussions[0];
            await supabase
                .from('agenda_items')
                .update({
                    discussion_id: discussion.id,
                    title: discussion.title,
                    description: discussion.description,
                })
                .eq('id', discussionSlot.id);
            linkedItems.discussion.push(discussion.id);
        }
    }

    // Auto-link announcements
    if (announcementSlot) {
        const announcements = await getEligibleItemsForTemplate(templateId, 'announcement', workspaceId);
        if (announcements && announcements.length > 0) {
            // Link all active announcements
            for (const announcement of announcements) {
                await supabase
                    .from('agenda_items')
                    .update({
                        announcement_id: announcement.id,
                        title: announcement.title,
                        description: announcement.content,
                    })
                    .eq('id', announcementSlot.id);
                linkedItems.announcement.push(announcement.id);
            }
        }
    }

    // Auto-link business items
    if (businessSlot) {
        const businessItems = await getEligibleItemsForTemplate(templateId, 'business', workspaceId);
        if (businessItems && businessItems.length > 0) {
            // Link all pending business items
            for (const business of businessItems) {
                await supabase
                    .from('agenda_items')
                    .update({
                        business_item_id: business.id,
                        title: business.title,
                        description: business.description,
                    })
                    .eq('id', businessSlot.id);
                linkedItems.business.push(business.id);
            }
        }
    }

    // Note: Speakers are NOT auto-linked per requirements

    return linkedItems;
}

/**
 * Manually link a specific item to an agenda slot
 */
export async function manuallyLinkItem(
    agendaItemId: string,
    itemType: SpecializedItemType,
    itemId: string
) {
    const supabase = await createClient();

    const updateData: any = {};

    switch (itemType) {
        case 'discussion':
            updateData.discussion_id = itemId;
            break;
        case 'announcement':
            updateData.announcement_id = itemId;
            break;
        case 'business':
            updateData.business_item_id = itemId;
            break;
        case 'speaker':
            updateData.speaker_id = itemId;
            break;
    }

    const { data, error } = await supabase
        .from('agenda_items')
        .update(updateData)
        .eq('id', agendaItemId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Check if a template item violates singleton constraint
 */
export function validateSingletonConstraint(
    existingItems: any[],
    newItemType: string
): { valid: boolean; error?: string } {
    const specializedTypes: SpecializedItemType[] = ['discussion', 'announcement', 'business', 'speaker'];

    if (!specializedTypes.includes(newItemType as SpecializedItemType)) {
        return { valid: true }; // Non-singleton items are always valid
    }

    const exists = existingItems.some((item) => item.item_type === newItemType);

    if (exists) {
        return {
            valid: false,
            error: `Only one ${newItemType} slot is allowed per template`,
        };
    }

    return { valid: true };
}
