/**
 * Data sanitization utilities for public share endpoints
 * Filters out sensitive fields like notes, workspace_id, created_by
 */

import type { PublicMeetingData, PublicAgendaItem, MeetingShareSettings } from "@/types/share";
import type { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];

/**
 * Sanitize meeting data for public consumption
 * Removes: notes, workspace_id, created_by, template_id
 */
export function sanitizeMeetingForPublic(meeting: Meeting): PublicMeetingData {
  return {
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    scheduled_date: meeting.scheduled_date,
    status: meeting.status,
    is_publicly_shared: meeting.is_publicly_shared,
    // share_uuid is added by the migration, but may not be in the type yet
    share_uuid: (meeting as Meeting & { share_uuid?: string }).share_uuid || "",
  };
}

/**
 * Sanitize agenda item data for public consumption
 * Removes: notes field
 */
export function sanitizeAgendaItemForPublic(item: AgendaItem): PublicAgendaItem {
  return {
    id: item.id,
    meeting_id: item.meeting_id,
    title: item.title,
    description: item.description,
    order_index: item.order_index,
    duration_minutes: item.duration_minutes,
    is_completed: item.is_completed,
    item_type: item.item_type,
    participant_name: item.participant_name,
  };
}

/**
 * Sanitize an array of agenda items for public consumption
 */
export function sanitizeAgendaItemsForPublic(items: AgendaItem[]): PublicAgendaItem[] {
  return items.map(sanitizeAgendaItemForPublic);
}

/**
 * Apply share settings to control what data is visible
 */
export function applyShareSettings(
  items: PublicAgendaItem[],
  settings: MeetingShareSettings | null
): PublicAgendaItem[] {
  if (!settings) {
    return items;
  }

  return items.map((item) => ({
    ...item,
    // Hide duration estimates if disabled
    duration_minutes: settings.show_duration_estimates ? item.duration_minutes : null,
    // Hide presenter names if disabled
    participant_name: settings.show_presenter_names ? item.participant_name : null,
  }));
}

/**
 * Check if a meeting can be publicly accessed
 */
export function canAccessPublicMeeting(meeting: Meeting | null): boolean {
  if (!meeting) return false;
  return meeting.is_publicly_shared && meeting.public_share_token !== null;
}

/**
 * Sanitize a complete meeting view for public consumption
 */
export function sanitizeMeetingViewForPublic(
  meeting: Meeting,
  items: AgendaItem[],
  settings: MeetingShareSettings | null,
  workspaceName?: string
) {
  const publicMeeting = sanitizeMeetingForPublic(meeting);
  let publicItems = sanitizeAgendaItemsForPublic(items);
  publicItems = applyShareSettings(publicItems, settings);

  return {
    meeting: publicMeeting,
    agenda_items: publicItems,
    settings,
    workspace_name: workspaceName,
  };
}
