// Database types - Complete schema for Beespo MVP
// This will be regenerated from Supabase after deployment:
// Run: npx supabase gen types typescript --project-id tuekpooasofqfawmpdxj > src/types/database.ts

// Agenda item types
export type AgendaItemType = 'procedural' | 'discussion' | 'business' | 'announcement' | 'speaker';

// Workspace types
export type WorkspaceType = 'ward' | 'branch' | 'stake' | 'district';
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
export type UserRole = 'admin' | 'leader' | 'guest';

// Invitation status
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          type: WorkspaceType;
          organization_type: OrganizationType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: WorkspaceType;
          organization_type: OrganizationType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: WorkspaceType;
          organization_type?: OrganizationType;
          created_at?: string;
          updated_at?: string;
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
      templates: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          calling_type: string | null;
          is_shared: boolean;
          folder_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          calling_type?: string | null;
          is_shared?: boolean;
          folder_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          calling_type?: string | null;
          is_shared?: boolean;
          folder_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_items: {
        Row: {
          id: string;
          template_id: string;
          title: string;
          description: string | null;
          order_index: number;
          duration_minutes: number | null;
          item_type: AgendaItemType;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          title: string;
          description?: string | null;
          order_index: number;
          duration_minutes?: number | null;
          item_type?: AgendaItemType;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          duration_minutes?: number | null;
          item_type?: AgendaItemType;
          created_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          workspace_id: string;
          template_id: string | null;
          title: string;
          scheduled_date: string;
          status: "scheduled" | "in_progress" | "completed" | "cancelled";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          template_id?: string | null;
          title: string;
          scheduled_date: string;
          status?: "scheduled" | "in_progress" | "completed" | "cancelled";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          template_id?: string | null;
          title?: string;
          scheduled_date?: string;
          status?: "scheduled" | "in_progress" | "completed" | "cancelled";
          created_by?: string | null;
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
          title: string;
          description: string | null;
          order_index: number;
          duration_minutes: number | null;
          notes: string | null;
          is_completed: boolean;
          item_type: AgendaItemType;
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
          title: string;
          description?: string | null;
          order_index: number;
          duration_minutes?: number | null;
          notes?: string | null;
          is_completed?: boolean;
          item_type?: AgendaItemType;
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
          title?: string;
          description?: string | null;
          order_index?: number;
          duration_minutes?: number | null;
          notes?: string | null;
          is_completed?: boolean;
          item_type?: AgendaItemType;
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
        };
        Insert: {
          id?: string;
          workspace_id: string;
          meeting_id?: string | null;
          agenda_item_id?: string | null;
          discussion_id?: string | null;
          business_item_id?: string | null;
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
        };
        Update: {
          id?: string;
          workspace_id?: string;
          meeting_id?: string | null;
          agenda_item_id?: string | null;
          discussion_id?: string | null;
          business_item_id?: string | null;
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
      announcements: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          content: string | null;
          priority: "low" | "medium" | "high";
          status: "draft" | "active" | "stopped";
          deadline: string | null;
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
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
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
      };
      template_folders: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      hidden_template_categories: {
        Row: {
          id: string;
          workspace_id: string;
          category_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          category_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          category_name?: string;
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
    };
    Enums: Record<string, never>;
  };
};
