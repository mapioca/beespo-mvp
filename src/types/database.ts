// Database types - Complete schema for Beespo MVP
// This will be regenerated from Supabase after deployment:
// Run: npx supabase gen types typescript --project-id tuekpooasofqfawmpdxj > src/types/database.ts

// Agenda item types
export type AgendaItemType = 'procedural' | 'discussion' | 'business' | 'announcement';

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          type: "ward" | "stake";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: "ward" | "stake";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: "ward" | "stake";
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          organization_id: string;
          role: "leader" | "member";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          organization_id: string;
          role: "leader" | "member";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          organization_id?: string;
          role?: "leader" | "member";
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          calling_type: string | null;
          is_shared: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          calling_type?: string | null;
          is_shared?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          calling_type?: string | null;
          is_shared?: boolean;
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
          organization_id: string;
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
          organization_id: string;
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
          organization_id?: string;
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
          organization_id: string;
          meeting_id: string | null;
          agenda_item_id: string | null;
          discussion_id: string | null;
          title: string;
          description: string | null;
          assigned_to: string | null;
          due_date: string | null;
          status: "pending" | "in_progress" | "completed" | "cancelled";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          meeting_id?: string | null;
          agenda_item_id?: string | null;
          discussion_id?: string | null;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          meeting_id?: string | null;
          agenda_item_id?: string | null;
          discussion_id?: string | null;
          title?: string;
          description?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      discussions: {
        Row: {
          id: string;
          organization_id: string;
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
          organization_id: string;
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
          organization_id?: string;
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
          organization_id: string;
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
          organization_id: string;
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
          organization_id?: string;
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
          organization_id: string;
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
          organization_id: string;
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
          organization_id?: string;
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
