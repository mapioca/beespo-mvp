// Database types - Complete schema for Beespo MVP
// This will be regenerated from Supabase after deployment:
// Run: npx supabase gen types typescript --project-id tuekpooasofqfawmpdxj > src/types/database.ts

// Agenda item types
export type AgendaItemType = 'procedural' | 'discussion' | 'business' | 'announcement' | 'speaker';

// Workspace types
export type WorkspaceType = 'group' | 'branch' | 'ward' | 'district' | 'stake';

// Feature tier for role-based access
export type FeatureTier = 'bishopric' | 'organization' | 'support';
export type OrganizationType =
  | 'bishopric'
  | 'elders_quorum'
  | 'relief_society'
  | 'young_men'
  | 'young_women'
  | 'primary'
  | 'missionary_work'
  | 'temple_family_history'
  | 'sunday_school';

// User roles
export type UserRole = 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';
export type FavoriteEntityType = 'meeting' | 'table' | 'form' | 'discussion' | 'notebook' | 'note';
export type MeetingPlanType = 'agenda' | 'program';
export type PlanDocumentStatus = 'draft' | 'finalized' | 'archived';
export type ProgramSegmentType =
  | 'prayer'
  | 'hymn'
  | 'spiritual_thought'
  | 'business'
  | 'speaker'
  | 'musical_number'
  | 'rest_hymn'
  | 'custom'
  | 'sacrament'
  | 'welcome'
  | 'closing'
  | 'announcement';
export type AssigneeType = 'member' | 'participant' | 'speaker' | 'external';
export type AssignableType = 'program_segment' | 'agenda_discussion_item';

// Recurrence types for calendar events
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

// Recurrence configuration for custom patterns
export interface RecurrenceConfig {
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number;   // 1-31
  interval?: number;     // Every N days/weeks/months
}

// External calendar subscription
export interface CalendarSubscription {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  color: string;
  is_enabled: boolean;
  last_synced_at: string | null;
  sync_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// External calendar event
export interface ExternalCalendarEvent {
  id: string;
  subscription_id: string;
  external_uid: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  is_all_day: boolean;
  raw_ical: string | null;
  created_at: string;
  updated_at: string;
}

// External event link
export interface ExternalEventLink {
  id: string;
  external_event_id: string;
  announcement_id: string;
  created_at: string;
}

// Notification types
export type NotificationType = 'meeting_shared' | 'meeting_starting_soon' | 'meeting_status_changed' | 'workspace_member_joined';

// Notification email frequency
export type NotificationEmailFrequency = 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';

// Invitation status
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

// Calling candidate status
export type CallingCandidateStatus = 'proposed' | 'discussing' | 'selected' | 'archived';

// Calling process stage
export type CallingProcessStage =
  | 'defined'
  | 'approved'
  | 'extended'
  | 'accepted'
  | 'sustained'
  | 'set_apart'
  | 'recorded_lcr';

// Calling process status
export type CallingProcessStatus = 'active' | 'completed' | 'dropped' | 'declined';

// Per-stage completion state stored in calling_processes.stage_statuses
export type CallingStageStatus = 'complete' | 'pending' | 'declined';
export type CallingStageStatuses = Partial<Record<CallingProcessStage, CallingStageStatus>>;

// Calling history action types
export type CallingHistoryAction =
  | 'process_started'
  | 'stage_changed'
  | 'status_changed'
  | 'comment_added'
  | 'task_created'
  | 'task_completed';

// Directory Tags
export interface DirectoryTag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectoryTagAssignment {
  id: string;
  directory_id: string;
  tag_id: string;
  created_at: string;
  tag?: DirectoryTag;
}

export type Database = {
  public: {
    Tables: {
      hymns: {
        Row: {
          id: string;
          book_id: string;
          hymn_number: number;
          title: string;
          topic: string | null;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          hymn_number: number;
          title: string;
          topic?: string | null;
          language?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          hymn_number?: number;
          title?: string;
          topic?: string | null;
          language?: string;
          created_at?: string;
        };
      };
      procedural_item_types: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          default_duration_minutes: number | null;
          order_hint: number | null;
          is_custom: boolean | null;
          is_hymn: boolean | null;
          created_at: string;
          workspace_id: string | null;
          // Config flags for item behavior
          requires_assignee: boolean | null;
          requires_resource: boolean | null;
          has_rich_text: boolean | null;
          icon: string | null;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          default_duration_minutes?: number | null;
          order_hint?: number | null;
          is_custom?: boolean | null;
          is_hymn?: boolean | null;
          created_at?: string;
          workspace_id?: string | null;
          // Config flags for item behavior
          requires_assignee?: boolean | null;
          requires_resource?: boolean | null;
          has_rich_text?: boolean | null;
          icon?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          default_duration_minutes?: number | null;
          order_hint?: number | null;
          is_custom?: boolean | null;
          is_hymn?: boolean | null;
          created_at?: string;
          workspace_id?: string | null;
          // Config flags for item behavior
          requires_assignee?: boolean | null;
          requires_resource?: boolean | null;
          has_rich_text?: boolean | null;
          icon?: string | null;
        };
      };
      discussion_templates: {
        Row: {
          discussion_id: string;
          template_id: string;
        };
        Insert: {
          discussion_id: string;
          template_id: string;
        };
        Update: {
          discussion_id?: string;
          template_id?: string;
        };
      };
      business_templates: {
        Row: {
          business_item_id: string;
          template_id: string;
        };
        Insert: {
          business_item_id: string;
          template_id: string;
        };
        Update: {
          business_item_id?: string;
          template_id?: string;
        };
      };
      announcement_templates: {
        Row: {
          announcement_id: string;
          template_id: string;
        };
        Insert: {
          announcement_id: string;
          template_id: string;
        };
        Update: {
          announcement_id?: string;
          template_id?: string;
        };
      };
      speaker_templates: {
        Row: {
          speaker_id: string;
          template_id: string;
        };
        Insert: {
          speaker_id: string;
          template_id: string;
        };
        Update: {
          speaker_id?: string;
          template_id?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          type: WorkspaceType;
          organization_type: OrganizationType;
          slug: string | null;
          unit_name: string | null;
          mfa_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: WorkspaceType;
          organization_type: OrganizationType;
          slug?: string | null;
          unit_name?: string | null;
          mfa_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: WorkspaceType;
          organization_type?: OrganizationType;
          slug?: string | null;
          unit_name?: string | null;
          mfa_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      trusted_devices: {
        Row: {
          id: string;
          user_id: string;
          device_token: string;
          device_name: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_token: string;
          device_name?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_token?: string;
          device_name?: string | null;
          expires_at?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          workspace_id: string | null;
          role: UserRole;
          is_sys_admin: boolean;
          role_title: string | null;
          feature_interests: string[] | null;
          feature_tier: FeatureTier | null;
          last_read_release_note_at: string | null;
          language_preference: 'ENG' | 'SPA';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          workspace_id?: string | null;
          role: UserRole;
          is_sys_admin?: boolean;
          role_title?: string | null;
          feature_interests?: string[] | null;
          feature_tier?: FeatureTier | null;
          last_read_release_note_at?: string | null;
          language_preference?: 'ENG' | 'SPA';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          workspace_id?: string | null;
          role?: UserRole;
          is_sys_admin?: boolean;
          role_title?: string | null;
          feature_interests?: string[] | null;
          feature_tier?: FeatureTier | null;
          last_read_release_note_at?: string | null;
          language_preference?: 'ENG' | 'SPA';
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: UserRole;
          token: string;
          invited_by: string | null;
          status: InvitationStatus;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role: UserRole;
          token?: string;
          invited_by?: string | null;
          status?: InvitationStatus;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          role?: UserRole;
          token?: string;
          invited_by?: string | null;
          status?: InvitationStatus;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      platform_invitations: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          max_uses: number;
          uses_count: number;
          expires_at: string | null;
          status: 'active' | 'exhausted' | 'expired' | 'revoked';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          max_uses?: number;
          uses_count?: number;
          expires_at?: string | null;
          status?: 'active' | 'exhausted' | 'expired' | 'revoked';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          max_uses?: number;
          uses_count?: number;
          expires_at?: string | null;
          status?: 'active' | 'exhausted' | 'expired' | 'revoked';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          calling_type: string | null;
          is_public: boolean;
          tags: string[];
          slug: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          template_kind: 'agenda' | 'program' | 'event' | 'table' | 'form' | null;
          template_schema_version: number | null;
          visibility: 'workspace' | 'public' | 'private' | null;
          source_entity_type: string | null;
          source_entity_id: string | null;
          version: number | null;
          is_active: boolean | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          defaults: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: any | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          name: string;
          description?: string | null;
          calling_type?: string | null;
          is_public?: boolean;
          tags?: string[];
          slug?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          template_kind?: 'agenda' | 'program' | 'event' | 'table' | 'form' | null;
          template_schema_version?: number | null;
          visibility?: 'workspace' | 'public' | 'private' | null;
          source_entity_type?: string | null;
          source_entity_id?: string | null;
          version?: number | null;
          is_active?: boolean | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content?: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          defaults?: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata?: any | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          name?: string;
          description?: string | null;
          calling_type?: string | null;
          is_public?: boolean;
          tags?: string[];
          slug?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          template_kind?: 'agenda' | 'program' | 'event' | 'table' | 'form' | null;
          template_schema_version?: number | null;
          visibility?: 'workspace' | 'public' | 'private' | null;
          source_entity_type?: string | null;
          source_entity_id?: string | null;
          version?: number | null;
          is_active?: boolean | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content?: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          defaults?: any | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata?: any | null;
          updated_by?: string | null;
        };
      };
      template_items: {
        Row: {
          id: string;
          template_id: string;
          title: string;
          description: string | null;
          item_notes: string | null;
          order_index: number;
          duration_minutes: number | null;
          item_type: AgendaItemType;
          created_at: string;
          procedural_item_type_id: string | null;
          hymn_id: string | null;
        };
        Insert: {
          id?: string;
          template_id: string;
          title: string;
          description?: string | null;
          item_notes?: string | null;
          order_index: number;
          duration_minutes?: number | null;
          item_type?: AgendaItemType;
          created_at?: string;
          procedural_item_type_id?: string | null;
          hymn_id?: string | null;
        };
        Update: {
          id?: string;
          template_id?: string;
          title?: string;
          description?: string | null;
          item_notes?: string | null;
          order_index?: number;
          duration_minutes?: number | null;
          item_type?: AgendaItemType;
          created_at?: string;
          procedural_item_type_id?: string | null;
          hymn_id?: string | null;
        };
      };
      meetings: {
        Row: {
          id: string;
          workspace_id: string;
          template_id: string | null;
          title: string;
          description: string | null;
          scheduled_date: string;
          status: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes: any | null; // Editor.js JSON
          public_share_token: string | null;
          is_publicly_shared: boolean;
          share_uuid: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          presiding_name: string | null;
          conducting_name: string | null;
          chorister_name: string | null;
          organist_name: string | null;
          attendance_count: number | null;
          markdown_agenda: string | null;
          zoom_meeting_id: string | null;
          zoom_join_url: string | null;
          zoom_start_url: string | null;
          zoom_passcode: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          program_style: any | null;
          event_id: string | null;
          is_legacy: boolean;
          plan_type: MeetingPlanType | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          template_id?: string | null;
          title: string;
          description?: string | null;
          scheduled_date: string;
          status?: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes?: any | null;
          public_share_token?: string | null;
          is_publicly_shared?: boolean;
          share_uuid?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          presiding_name?: string | null;
          conducting_name?: string | null;
          chorister_name?: string | null;
          organist_name?: string | null;
          attendance_count?: number | null;
          markdown_agenda?: string | null;
          zoom_meeting_id?: string | null;
          zoom_join_url?: string | null;
          zoom_start_url?: string | null;
          zoom_passcode?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          program_style?: any | null;
          event_id?: string | null;
          is_legacy?: boolean;
          plan_type?: MeetingPlanType | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          template_id?: string | null;
          title?: string;
          description?: string | null;
          scheduled_date?: string;
          status?: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes?: any | null;
          public_share_token?: string | null;
          is_publicly_shared?: boolean;
          share_uuid?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          presiding_name?: string | null;
          conducting_name?: string | null;
          chorister_name?: string | null;
          organist_name?: string | null;
          attendance_count?: number | null;
          markdown_agenda?: string | null;
          zoom_meeting_id?: string | null;
          zoom_join_url?: string | null;
          zoom_start_url?: string | null;
          zoom_passcode?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          program_style?: any | null;
          event_id?: string | null;
          is_legacy?: boolean;
          plan_type?: MeetingPlanType | null;
        };
      };
      catalog_items: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          category: string;
          default_duration_minutes: number | null;
          icon: string | null;
          is_core: boolean | null;
          is_custom: boolean | null;
          is_hymn: boolean | null;
          hymn_number: number | null;
          requires_assignee: boolean | null;
          has_rich_text: boolean | null;
          order_hint: number | null;
          is_deprecated: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          name: string;
          description?: string | null;
          category?: string;
          default_duration_minutes?: number | null;
          icon?: string | null;
          is_core?: boolean | null;
          is_custom?: boolean | null;
          is_hymn?: boolean | null;
          hymn_number?: number | null;
          requires_assignee?: boolean | null;
          has_rich_text?: boolean | null;
          order_hint?: number | null;
          is_deprecated?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          name?: string;
          description?: string | null;
          category?: string;
          default_duration_minutes?: number | null;
          icon?: string | null;
          is_core?: boolean | null;
          is_custom?: boolean | null;
          is_hymn?: boolean | null;
          hymn_number?: number | null;
          requires_assignee?: boolean | null;
          has_rich_text?: boolean | null;
          order_hint?: number | null;
          is_deprecated?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_items: {
        Row: {
          id: string;
          meeting_id: string;
          discussion_id: string | null;
          business_item_id: string | null;
          announcement_id: string | null;
          speaker_id: string | null;
          hymn_id: string | null;
          title: string;
          description: string | null;
          item_notes: string | null;
          order_index: number;
          duration_minutes: number | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes: any | null; // Editor.js JSON
          is_completed: boolean;
          item_type: AgendaItemType;
          participant_id: string | null;
          participant_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          discussion_id?: string | null;
          business_item_id?: string | null;
          announcement_id?: string | null;
          speaker_id?: string | null;
          hymn_id?: string | null;
          title: string;
          description?: string | null;
          item_notes?: string | null;
          order_index: number;
          duration_minutes?: number | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes?: any | null;
          is_completed?: boolean;
          item_type?: AgendaItemType;
          participant_id?: string | null;
          participant_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          discussion_id?: string | null;
          business_item_id?: string | null;
          announcement_id?: string | null;
          speaker_id?: string | null;
          hymn_id?: string | null;
          title?: string;
          description?: string | null;
          item_notes?: string | null;
          order_index?: number;
          duration_minutes?: number | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes?: any | null;
          is_completed?: boolean;
          item_type?: AgendaItemType;
          participant_id?: string | null;
          participant_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          meeting_id: string | null;
          agenda_item_id: string | null;
          discussion_id: string | null;
          business_item_id: string | null;
          calling_process_id: string | null;
          title: string;
          description: string | null;
          assigned_to: string | null;
          due_date: string | null;
          status: "pending" | "in_progress" | "completed" | "cancelled";
          completed_at: string | null;
          access_token: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          workspace_task_id: string | null;
          priority: "low" | "medium" | "high";
          tags: string[] | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          meeting_id?: string | null;
          agenda_item_id?: string | null;
          discussion_id?: string | null;
          business_item_id?: string | null;
          calling_process_id?: string | null;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          completed_at?: string | null;
          access_token?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          workspace_task_id?: string | null;
          priority?: "low" | "medium" | "high";
          tags?: string[] | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          meeting_id?: string | null;
          agenda_item_id?: string | null;
          discussion_id?: string | null;
          business_item_id?: string | null;
          calling_process_id?: string | null;
          title?: string;
          description?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          completed_at?: string | null;
          access_token?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          workspace_task_id?: string | null;
          priority?: "low" | "medium" | "high";
          tags?: string[] | null;
        };
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_activities: {
        Row: {
          id: string;
          task_id: string;
          user_id: string | null;
          activity_type: string;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id?: string | null;
          activity_type: string;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string | null;
          activity_type?: string;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
      discussions: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          category:
          | "member_concerns"
          | "activities"
          | "service_opportunities"
          | "callings"
          | "temple_work"
          | "budget"
          | "facilities"
          | "youth"
          | "mission_work"
          | "other";
          status:
          | "new"
          | "active"
          | "decision_required"
          | "monitoring"
          | "resolved"
          | "deferred";
          priority: "low" | "medium" | "high";
          due_date: string | null;
          deferred_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          category:
          | "member_concerns"
          | "activities"
          | "service_opportunities"
          | "callings"
          | "temple_work"
          | "budget"
          | "facilities"
          | "youth"
          | "mission_work"
          | "other";
          status?:
          | "new"
          | "active"
          | "decision_required"
          | "monitoring"
          | "resolved"
          | "deferred";
          priority?: "low" | "medium" | "high";
          due_date?: string | null;
          deferred_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          category?:
          | "member_concerns"
          | "activities"
          | "service_opportunities"
          | "callings"
          | "temple_work"
          | "budget"
          | "facilities"
          | "youth"
          | "mission_work"
          | "other";
          status?:
          | "new"
          | "active"
          | "decision_required"
          | "monitoring"
          | "resolved"
          | "deferred";
          priority?: "low" | "medium" | "high";
          due_date?: string | null;
          deferred_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      discussion_notes: {
        Row: {
          id: string;
          discussion_id: string;
          meeting_id: string | null;
          content: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          discussion_id: string;
          meeting_id?: string | null;
          content: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          discussion_id?: string;
          meeting_id?: string | null;
          content?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_items: {
        Row: {
          id: string;
          workspace_id: string;
          person_name: string;
          position_calling: string | null;
          category:
          | "sustaining"
          | "release"
          | "confirmation"
          | "ordination"
          | "setting_apart"
          | "other";
          status: "pending" | "completed";
          action_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          person_name: string;
          position_calling?: string | null;
          category:
          | "sustaining"
          | "release"
          | "confirmation"
          | "ordination"
          | "setting_apart"
          | "other";
          status?: "pending" | "completed";
          action_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          person_name?: string;
          position_calling?: string | null;
          category?:
          | "sustaining"
          | "release"
          | "confirmation"
          | "ordination"
          | "setting_apart"
          | "other";
          status?: "pending" | "completed";
          action_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      directory: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          gender: "male" | "female" | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          gender?: "male" | "female" | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          gender?: "male" | "female" | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          content: string | null;
          priority: "low" | "medium" | "high";
          status: "draft" | "active" | "stopped";
          deadline: string | null;
          schedule_date: string | null;
          recurrence_type: RecurrenceType | null;
          recurrence_end_date: string | null;
          recurrence_config: RecurrenceConfig;
          event_id: string | null;
          display_start: string | null;
          display_until: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          content?: string | null;
          priority?: "low" | "medium" | "high";
          status?: "draft" | "active" | "stopped";
          deadline?: string | null;
          schedule_date?: string | null;
          recurrence_type?: RecurrenceType | null;
          recurrence_end_date?: string | null;
          recurrence_config?: RecurrenceConfig;
          event_id?: string | null;
          display_start?: string | null;
          display_until?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          content?: string | null;
          priority?: "low" | "medium" | "high";
          status?: "draft" | "active" | "stopped";
          deadline?: string | null;
          schedule_date?: string | null;
          recurrence_type?: RecurrenceType | null;
          recurrence_end_date?: string | null;
          recurrence_config?: RecurrenceConfig;
          event_id?: string | null;
          display_start?: string | null;
          display_until?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          event_type: "interview" | "meeting" | "activity";
          description: string | null;
          location: string | null;
          start_at: string;
          end_at: string;
          is_all_day: boolean;
          date_tbd: boolean;
          time_tbd: boolean;
          duration_mode: "minutes" | "tbd" | "all_day";
          duration_minutes: number | null;
          workspace_event_id: string | null;
          external_source_id: string | null;
          external_source_type: "google" | "outlook" | "ics" | "apple" | "other" | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          event_type?: "interview" | "meeting" | "activity";
          description?: string | null;
          location?: string | null;
          start_at: string;
          end_at: string;
          is_all_day?: boolean;
          date_tbd?: boolean;
          time_tbd?: boolean;
          duration_mode?: "minutes" | "tbd" | "all_day";
          duration_minutes?: number | null;
          workspace_event_id?: string | null;
          external_source_id?: string | null;
          external_source_type?: "google" | "outlook" | "ics" | "apple" | "other" | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          event_type?: "interview" | "meeting" | "activity";
          description?: string | null;
          location?: string | null;
          start_at?: string;
          end_at?: string;
          is_all_day?: boolean;
          date_tbd?: boolean;
          time_tbd?: boolean;
          duration_mode?: "minutes" | "tbd" | "all_day";
          duration_minutes?: number | null;
          workspace_event_id?: string | null;
          external_source_id?: string | null;
          external_source_type?: "google" | "outlook" | "ics" | "apple" | "other" | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_event_counters: {
        Row: {
          workspace_id: string;
          counter: number;
        };
        Insert: {
          workspace_id: string;
          counter?: number;
        };
        Update: {
          workspace_id?: string;
          counter?: number;
        };
      };
      speakers: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          topic: string;
          is_confirmed: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          topic: string;
          is_confirmed?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          topic?: string;
          is_confirmed?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      },
      notes: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: any; // Editor.js JSON
          is_personal: boolean;
          created_by: string;
          notebook_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content?: any;
          is_personal?: boolean;
          created_by: string;
          notebook_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content?: any;
          is_personal?: boolean;
          created_by?: string;
          notebook_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      note_associations: {
        Row: {
          id: string;
          note_id: string;
          entity_type: "discussion" | "meeting" | "task";
          entity_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          entity_type: "discussion" | "meeting" | "task";
          entity_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          note_id?: string;
          entity_type?: "discussion" | "meeting" | "task";
          entity_id?: string;
          created_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calendar_subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          url: string;
          color: string | null;
          is_enabled: boolean | null;
          last_synced_at: string | null;
          sync_error: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          url: string;
          color?: string | null;
          is_enabled?: boolean | null;
          last_synced_at?: string | null;
          sync_error?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          url?: string;
          color?: string | null;
          is_enabled?: boolean | null;
          last_synced_at?: string | null;
          sync_error?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      external_calendar_events: {
        Row: {
          id: string;
          subscription_id: string;
          external_uid: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          location: string | null;
          is_all_day: boolean | null;
          raw_ical: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          external_uid: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date?: string | null;
          location?: string | null;
          is_all_day?: boolean | null;
          raw_ical?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          external_uid?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string | null;
          location?: string | null;
          is_all_day?: boolean | null;
          raw_ical?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      external_event_links: {
        Row: {
          id: string;
          external_event_id: string | null;
          announcement_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          external_event_id?: string | null;
          announcement_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          external_event_id?: string | null;
          announcement_id?: string | null;
          created_at?: string;
        };
      };
      time_logs: {
        Row: {
          id: string;
          meeting_id: string;
          agenda_item_id: string | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          agenda_item_id?: string | null;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          agenda_item_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
      };
      // =====================================================
      // CALLINGS FEATURE TABLES
      // =====================================================
      candidate_names: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      callings: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          organization: string | null;
          is_filled: boolean;
          filled_by: string | null;
          filled_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          organization?: string | null;
          is_filled?: boolean;
          filled_by?: string | null;
          filled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          organization?: string | null;
          is_filled?: boolean;
          filled_by?: string | null;
          filled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calling_candidates: {
        Row: {
          id: string;
          calling_id: string;
          candidate_name_id: string;
          status: CallingCandidateStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          calling_id: string;
          candidate_name_id: string;
          status?: CallingCandidateStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          calling_id?: string;
          candidate_name_id?: string;
          status?: CallingCandidateStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calling_processes: {
        Row: {
          id: string;
          calling_id: string;
          candidate_name_id: string;
          calling_candidate_id: string | null;
          current_stage: CallingProcessStage;
          status: CallingProcessStatus;
          dropped_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          calling_id: string;
          candidate_name_id: string;
          calling_candidate_id?: string | null;
          current_stage?: CallingProcessStage;
          status?: CallingProcessStatus;
          dropped_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          calling_id?: string;
          candidate_name_id?: string;
          calling_candidate_id?: string | null;
          current_stage?: CallingProcessStage;
          status?: CallingProcessStatus;
          dropped_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calling_history_log: {
        Row: {
          id: string;
          calling_process_id: string;
          action: CallingHistoryAction;
          from_value: string | null;
          to_value: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          calling_process_id: string;
          action: CallingHistoryAction;
          from_value?: string | null;
          to_value?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          calling_process_id?: string;
          action?: CallingHistoryAction;
          from_value?: string | null;
          to_value?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      calling_comments: {
        Row: {
          id: string;
          calling_process_id: string;
          content: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          calling_process_id: string;
          content: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          calling_process_id?: string;
          content?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      release_notes: {
        Row: {
          id: string;
          title: string;
          version: string | null;
          content: unknown; // JSONB: ReleaseNoteItem[]
          status: 'draft' | 'published';
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          version?: string | null;
          content: unknown;
          status?: 'draft' | 'published';
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          version?: string | null;
          content?: unknown;
          status?: 'draft' | 'published';
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dashboard_layout: any; // DashboardConfig JSON
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dashboard_layout?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dashboard_layout?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_favorites: {
        Row: {
          user_id: string;
          entity_type: FavoriteEntityType;
          entity_id: string;
          workspace_id: string;
          title: string;
          href: string;
          parent_title: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          entity_type: FavoriteEntityType;
          entity_id: string;
          workspace_id: string;
          title: string;
          href: string;
          parent_title?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          entity_type?: FavoriteEntityType;
          entity_id?: string;
          workspace_id?: string;
          title?: string;
          href?: string;
          parent_title?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_recent_items: {
        Row: {
          user_id: string;
          entity_type: FavoriteEntityType;
          entity_id: string;
          workspace_id: string;
          title: string;
          href: string;
          parent_title: string | null;
          last_viewed_at: string;
        };
        Insert: {
          user_id: string;
          entity_type: FavoriteEntityType;
          entity_id: string;
          workspace_id: string;
          title: string;
          href: string;
          parent_title?: string | null;
          last_viewed_at?: string;
        };
        Update: {
          user_id?: string;
          entity_type?: FavoriteEntityType;
          entity_id?: string;
          workspace_id?: string;
          title?: string;
          href?: string;
          parent_title?: string | null;
          last_viewed_at?: string;
        };
      };
      notebooks: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          cover_style: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title?: string;
          cover_style?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          cover_style?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_share_invitations: {
        Row: {
          id: string;
          meeting_id: string;
          email: string;
          permission: "viewer" | "editor";
          token: string;
          invited_by: string | null;
          status: "pending" | "accepted" | "revoked" | "expired";
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          email: string;
          permission: "viewer" | "editor";
          token?: string;
          invited_by?: string | null;
          status?: "pending" | "accepted" | "revoked" | "expired";
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          email?: string;
          permission?: "viewer" | "editor";
          token?: string;
          invited_by?: string | null;
          status?: "pending" | "accepted" | "revoked" | "expired";
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_share_views: {
        Row: {
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
        };
        Insert: {
          id?: string;
          meeting_id: string;
          visitor_fingerprint: string;
          first_viewed_at?: string;
          last_viewed_at?: string;
          view_count?: number;
          referrer?: string | null;
          user_agent?: string | null;
          country_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          visitor_fingerprint?: string;
          first_viewed_at?: string;
          last_viewed_at?: string;
          view_count?: number;
          referrer?: string | null;
          user_agent?: string | null;
          country_code?: string | null;
          created_at?: string;
        };
      };
      meeting_share_settings: {
        Row: {
          meeting_id: string;
          allow_notes_export: boolean;
          show_duration_estimates: boolean;
          show_presenter_names: boolean;
          custom_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          meeting_id: string;
          allow_notes_export?: boolean;
          show_duration_estimates?: boolean;
          show_presenter_names?: boolean;
          custom_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          meeting_id?: string;
          allow_notes_export?: boolean;
          show_duration_estimates?: boolean;
          show_presenter_names?: boolean;
          custom_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sharing_groups: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sharing_group_members: {
        Row: {
          id: string;
          group_id: string;
          email: string;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          email: string;
          added_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          email?: string;
          added_by?: string | null;
          created_at?: string;
        };
      };
      meeting_shares: {
        Row: {
          id: string;
          meeting_id: string;
          recipient_email: string;
          recipient_user_id: string | null;
          permission: 'viewer' | 'editor';
          shared_by: string;
          sharing_group_id: string | null;
          status: 'active' | 'revoked';
          token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          recipient_email: string;
          recipient_user_id?: string | null;
          permission: 'viewer' | 'editor';
          shared_by: string;
          sharing_group_id?: string | null;
          status?: 'active' | 'revoked';
          token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          recipient_email?: string;
          recipient_user_id?: string | null;
          permission?: 'viewer' | 'editor';
          shared_by?: string;
          sharing_group_id?: string | null;
          status?: 'active' | 'revoked';
          token?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          metadata: Record<string, unknown>;
          read_at: string | null;
          digest_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          metadata?: Record<string, unknown>;
          read_at?: string | null;
          digest_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          metadata?: Record<string, unknown>;
          read_at?: string | null;
          digest_sent_at?: string | null;
          created_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          notification_type: string;
          in_app_enabled: boolean;
          email_enabled: boolean;
          email_frequency: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_type: string;
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          email_frequency?: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_type?: string;
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          email_frequency?: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_documents: {
        Row: {
          id: string;
          meeting_id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          status: PlanDocumentStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          status?: PlanDocumentStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          status?: PlanDocumentStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_objectives: {
        Row: {
          id: string;
          agenda_document_id: string;
          title: string;
          description: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agenda_document_id: string;
          title: string;
          description?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agenda_document_id?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_discussion_items: {
        Row: {
          id: string;
          agenda_document_id: string;
          topic: string;
          estimated_time: number;
          notes: string | null;
          order_index: number;
          status: 'pending' | 'in_progress' | 'completed' | 'deferred';
          catalog_item_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agenda_document_id: string;
          topic: string;
          estimated_time?: number;
          notes?: string | null;
          order_index?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'deferred';
          catalog_item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agenda_document_id?: string;
          topic?: string;
          estimated_time?: number;
          notes?: string | null;
          order_index?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'deferred';
          catalog_item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_discussion_tasks: {
        Row: {
          agenda_discussion_item_id: string;
          task_id: string;
          created_at: string;
        };
        Insert: {
          agenda_discussion_item_id: string;
          task_id: string;
          created_at?: string;
        };
        Update: {
          agenda_discussion_item_id?: string;
          task_id?: string;
          created_at?: string;
        };
      };
      program_documents: {
        Row: {
          id: string;
          meeting_id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style_config: any | null;
          status: PlanDocumentStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style_config?: any | null;
          status?: PlanDocumentStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style_config?: any | null;
          status?: PlanDocumentStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      program_segments: {
        Row: {
          id: string;
          program_document_id: string;
          title: string;
          estimated_time: number;
          description: string | null;
          segment_type: ProgramSegmentType;
          order_index: number;
          catalog_item_id: string | null;
          hymn_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_document_id: string;
          title: string;
          estimated_time?: number;
          description?: string | null;
          segment_type?: ProgramSegmentType;
          order_index?: number;
          catalog_item_id?: string | null;
          hymn_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          program_document_id?: string;
          title?: string;
          estimated_time?: number;
          description?: string | null;
          segment_type?: ProgramSegmentType;
          order_index?: number;
          catalog_item_id?: string | null;
          hymn_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      plan_assignments: {
        Row: {
          id: string;
          workspace_id: string;
          assignable_type: AssignableType;
          assignable_id: string;
          assignee_type: AssigneeType;
          assignee_id: string | null;
          assignee_name: string | null;
          role: string | null;
          is_confirmed: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          assignable_type: AssignableType;
          assignable_id: string;
          assignee_type: AssigneeType;
          assignee_id?: string | null;
          assignee_name?: string | null;
          role?: string | null;
          is_confirmed?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          assignable_type?: AssignableType;
          assignable_id?: string;
          assignee_type?: AssigneeType;
          assignee_id?: string | null;
          assignee_name?: string | null;
          role?: string | null;
          is_confirmed?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      discussion_item_library: {
        Row: {
          id: string;
          workspace_id: string;
          topic: string;
          estimated_time: number | null;
          notes_template: string | null;
          tags: string[] | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          topic: string;
          estimated_time?: number | null;
          notes_template?: string | null;
          tags?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          topic?: string;
          estimated_time?: number | null;
          notes_template?: string | null;
          tags?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      segment_library: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          estimated_time: number | null;
          description: string | null;
          segment_type: ProgramSegmentType | null;
          catalog_item_id: string | null;
          tags: string[] | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          estimated_time?: number | null;
          description?: string | null;
          segment_type?: ProgramSegmentType | null;
          catalog_item_id?: string | null;
          tags?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          estimated_time?: number | null;
          description?: string | null;
          segment_type?: ProgramSegmentType | null;
          catalog_item_id?: string | null;
          tags?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      share_activity_log: {
        Row: {
          id: string;
          workspace_id: string;
          action: 'shared' | 'revoked' | 'group_created' | 'group_updated' | 'member_added' | 'member_removed';
          entity_type: string;
          entity_id: string | null;
          target_email: string | null;
          sharing_group_id: string | null;
          performed_by: string;
          details: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          action: 'shared' | 'revoked' | 'group_created' | 'group_updated' | 'member_added' | 'member_removed';
          entity_type?: string;
          entity_id?: string | null;
          target_email?: string | null;
          sharing_group_id?: string | null;
          performed_by: string;
          details?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          action?: 'shared' | 'revoked' | 'group_created' | 'group_updated' | 'member_added' | 'member_removed';
          entity_type?: string;
          entity_id?: string | null;
          target_email?: string | null;
          sharing_group_id?: string | null;
          performed_by?: string;
          details?: Record<string, unknown>;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_meeting_from_template: {
        Args: {
          p_template_id: string;
          p_title: string;
          p_scheduled_date: string;
        };
        Returns: string;
      };
      link_shares_to_new_user: {
        Args: {
          p_user_id: string;
          p_user_email: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
};
