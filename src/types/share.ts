/**
 * Types for the Universal Share Distribution Hub
 */

// Permission levels for share invitations
export type SharePermission = 'viewer' | 'editor';

// Status of a share invitation
export type ShareInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

// Export format types
export type ExportFormat = 'markdown' | 'html' | 'ics';

/**
 * Meeting share invitation record
 */
export interface MeetingShareInvitation {
  id: string;
  meeting_id: string;
  email: string;
  permission: SharePermission;
  token: string;
  invited_by: string | null;
  status: ShareInvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Meeting share view record for analytics
 */
export interface MeetingShareView {
  id: string;
  meeting_id: string;
  visitor_fingerprint: string;
  first_viewed_at: string;
  last_viewed_at: string;
  view_count: number;
  referrer: string | null;
  user_agent: string | null;
  country_code: string | null;
  created_at: string;
}

/**
 * Meeting share settings configuration
 */
export interface MeetingShareSettings {
  meeting_id: string;
  allow_notes_export: boolean;
  show_duration_estimates: boolean;
  show_presenter_names: boolean;
  custom_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Share analytics summary
 */
export interface ShareAnalytics {
  total_views: number;
  unique_visitors: number;
  first_view: string | null;
  last_view: string | null;
}

/**
 * Input for creating a share invitation
 */
export interface CreateShareInvitationInput {
  meeting_id: string;
  email: string;
  permission: SharePermission;
}

/**
 * Input for tracking a view
 */
export interface TrackViewInput {
  meeting_id: string;
  visitor_fingerprint: string;
  referrer?: string;
  user_agent?: string;
}

/**
 * Input for export generation
 */
export interface ExportInput {
  meeting_id: string;
  format: ExportFormat;
  include_url?: boolean;
}

/**
 * Exported content result
 */
export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

/**
 * Sanitized meeting data for public consumption
 * Excludes sensitive fields like notes, workspace_id, created_by
 */
export interface PublicMeetingData {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  is_publicly_shared: boolean;
  share_uuid: string;
}

/**
 * Sanitized agenda item for public consumption
 * Excludes notes field
 */
export interface PublicAgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  is_completed: boolean;
  item_type: string;
  structural_type?: string | null;
  participant_name: string | null;
}

/**
 * Combined public meeting view data
 */
export interface PublicMeetingView {
  meeting: PublicMeetingData;
  agenda_items: PublicAgendaItem[];
  settings: MeetingShareSettings | null;
  workspace_name?: string;
}

/**
 * Share dialog tab values
 */
export type ShareDialogTab = 'invite' | 'public-link' | 'export';

/**
 * Share dialog state
 */
export interface ShareDialogState {
  activeTab: ShareDialogTab;
  isLoading: boolean;
  invitations: MeetingShareInvitation[];
  settings: MeetingShareSettings | null;
  analytics: ShareAnalytics | null;
}
