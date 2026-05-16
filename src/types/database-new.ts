export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agenda_discussion_items: {
        Row: {
          agenda_document_id: string
          catalog_item_id: string | null
          created_at: string | null
          estimated_time: number
          id: string
          notes: string | null
          order_index: number
          status: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          agenda_document_id: string
          catalog_item_id?: string | null
          created_at?: string | null
          estimated_time?: number
          id?: string
          notes?: string | null
          order_index?: number
          status?: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          agenda_document_id?: string
          catalog_item_id?: string | null
          created_at?: string | null
          estimated_time?: number
          id?: string
          notes?: string | null
          order_index?: number
          status?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_discussion_items_agenda_document_id_fkey"
            columns: ["agenda_document_id"]
            isOneToOne: false
            referencedRelation: "agenda_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_discussion_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_discussion_tasks: {
        Row: {
          agenda_discussion_item_id: string
          created_at: string | null
          task_id: string
        }
        Insert: {
          agenda_discussion_item_id: string
          created_at?: string | null
          task_id: string
        }
        Update: {
          agenda_discussion_item_id?: string
          created_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_discussion_tasks_agenda_discussion_item_id_fkey"
            columns: ["agenda_discussion_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_discussion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_discussion_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          meeting_id: string
          status: Database["public"]["Enums"]["plan_document_status"]
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          meeting_id: string
          status?: Database["public"]["Enums"]["plan_document_status"]
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          meeting_id?: string
          status?: Database["public"]["Enums"]["plan_document_status"]
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_documents_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_items: {
        Row: {
          announcement_id: string | null
          business_item_id: string | null
          child_items: Json | null
          created_at: string | null
          description: string | null
          discussion_id: string | null
          duration_minutes: number | null
          hymn_id: string | null
          id: string
          is_completed: boolean | null
          item_notes: string | null
          item_type: Database["public"]["Enums"]["agenda_item_type"]
          meeting_id: string | null
          notes: Json | null
          order_index: number
          participant_id: string | null
          participant_name: string | null
          speaker_id: string | null
          speaker_topic: string | null
          structural_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_id?: string | null
          business_item_id?: string | null
          child_items?: Json | null
          created_at?: string | null
          description?: string | null
          discussion_id?: string | null
          duration_minutes?: number | null
          hymn_id?: string | null
          id?: string
          is_completed?: boolean | null
          item_notes?: string | null
          item_type?: Database["public"]["Enums"]["agenda_item_type"]
          meeting_id?: string | null
          notes?: Json | null
          order_index: number
          participant_id?: string | null
          participant_name?: string | null
          speaker_id?: string | null
          speaker_topic?: string | null
          structural_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_id?: string | null
          business_item_id?: string | null
          child_items?: Json | null
          created_at?: string | null
          description?: string | null
          discussion_id?: string | null
          duration_minutes?: number | null
          hymn_id?: string | null
          id?: string
          is_completed?: boolean | null
          item_notes?: string | null
          item_type?: Database["public"]["Enums"]["agenda_item_type"]
          meeting_id?: string | null
          notes?: Json | null
          order_index?: number
          participant_id?: string | null
          participant_name?: string | null
          speaker_id?: string | null
          speaker_topic?: string | null
          structural_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_business_item_id_fkey"
            columns: ["business_item_id"]
            isOneToOne: false
            referencedRelation: "business_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussion_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_hymn_id_fkey"
            columns: ["hymn_id"]
            isOneToOne: false
            referencedRelation: "hymns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "meeting_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_objectives: {
        Row: {
          agenda_document_id: string
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string | null
        }
        Insert: {
          agenda_document_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          agenda_document_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_objectives_agenda_document_id_fkey"
            columns: ["agenda_document_id"]
            isOneToOne: false
            referencedRelation: "agenda_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_views: {
        Row: {
          created_at: string
          created_by: string | null
          filters: Json
          id: string
          name: string
          updated_at: string
          view_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filters?: Json
          id?: string
          name: string
          updated_at?: string
          view_type?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          view_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_views_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_templates: {
        Row: {
          announcement_id: string
          template_id: string
        }
        Insert: {
          announcement_id: string
          template_id: string
        }
        Update: {
          announcement_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_templates_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          display_start: string | null
          display_until: string | null
          event_id: string | null
          id: string
          priority: string
          recurrence_config: Json | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          schedule_date: string | null
          status: string
          title: string
          updated_at: string | null
          workspace_announcement_id: string | null
          workspace_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          display_start?: string | null
          display_until?: string | null
          event_id?: string | null
          id?: string
          priority?: string
          recurrence_config?: Json | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          schedule_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
          workspace_announcement_id?: string | null
          workspace_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          display_start?: string | null
          display_until?: string | null
          event_id?: string | null
          id?: string
          priority?: string
          recurrence_config?: Json | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          schedule_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          workspace_announcement_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      app_tokens: {
        Row: {
          access_token: string
          app_id: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          scopes: string[] | null
          updated_at: string | null
          user_id: string
          workspace_id: string
          zoom_plan_type: number | null
        }
        Insert: {
          access_token: string
          app_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scopes?: string[] | null
          updated_at?: string | null
          user_id: string
          workspace_id: string
          zoom_plan_type?: number | null
        }
        Update: {
          access_token?: string
          app_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scopes?: string[] | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
          zoom_plan_type?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          features: string[] | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          oauth_scopes: string[] | null
          requires_oauth: boolean | null
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          oauth_scopes?: string[] | null
          requires_oauth?: boolean | null
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          oauth_scopes?: string[] | null
          requires_oauth?: boolean | null
          slug?: string
        }
        Relationships: []
      }
      business_items: {
        Row: {
          action_date: string | null
          category: string
          created_at: string | null
          created_by: string | null
          details: Json | null
          id: string
          notes: string | null
          person_name: string
          position_calling: string | null
          status: string
          updated_at: string | null
          workspace_business_id: string | null
          workspace_id: string
        }
        Insert: {
          action_date?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          notes?: string | null
          person_name: string
          position_calling?: string | null
          status?: string
          updated_at?: string | null
          workspace_business_id?: string | null
          workspace_id: string
        }
        Update: {
          action_date?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          notes?: string | null
          person_name?: string
          position_calling?: string | null
          status?: string
          updated_at?: string | null
          workspace_business_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_items_organization_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_templates: {
        Row: {
          business_item_id: string
          template_id: string
        }
        Insert: {
          business_item_id: string
          template_id: string
        }
        Update: {
          business_item_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_templates_business_item_id_fkey"
            columns: ["business_item_id"]
            isOneToOne: false
            referencedRelation: "business_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_subscriptions: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_enabled: boolean | null
          last_synced_at: string | null
          name: string
          sync_error: string | null
          updated_at: string | null
          url: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_synced_at?: string | null
          name: string
          sync_error?: string | null
          updated_at?: string | null
          url: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_synced_at?: string | null
          name?: string
          sync_error?: string | null
          updated_at?: string | null
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calling_candidates: {
        Row: {
          calling_id: string
          candidate_name_id: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          calling_id: string
          candidate_name_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          calling_id?: string
          candidate_name_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calling_candidates_calling_id_fkey"
            columns: ["calling_id"]
            isOneToOne: false
            referencedRelation: "calling_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_candidates_calling_id_fkey"
            columns: ["calling_id"]
            isOneToOne: false
            referencedRelation: "callings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_candidates_candidate_name_id_fkey"
            columns: ["candidate_name_id"]
            isOneToOne: false
            referencedRelation: "candidate_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calling_comments: {
        Row: {
          calling_process_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          calling_process_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          calling_process_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calling_comments_calling_process_id_fkey"
            columns: ["calling_process_id"]
            isOneToOne: false
            referencedRelation: "calling_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calling_history_log: {
        Row: {
          action: string
          calling_process_id: string
          created_at: string | null
          created_by: string | null
          from_value: string | null
          id: string
          notes: string | null
          to_value: string | null
        }
        Insert: {
          action: string
          calling_process_id: string
          created_at?: string | null
          created_by?: string | null
          from_value?: string | null
          id?: string
          notes?: string | null
          to_value?: string | null
        }
        Update: {
          action?: string
          calling_process_id?: string
          created_at?: string | null
          created_by?: string | null
          from_value?: string | null
          id?: string
          notes?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calling_history_log_calling_process_id_fkey"
            columns: ["calling_process_id"]
            isOneToOne: false
            referencedRelation: "calling_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_history_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calling_processes: {
        Row: {
          calling_candidate_id: string | null
          calling_id: string
          candidate_name_id: string
          created_at: string | null
          created_by: string | null
          current_stage: string
          dropped_reason: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          calling_candidate_id?: string | null
          calling_id: string
          candidate_name_id: string
          created_at?: string | null
          created_by?: string | null
          current_stage?: string
          dropped_reason?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          calling_candidate_id?: string | null
          calling_id?: string
          candidate_name_id?: string
          created_at?: string | null
          created_by?: string | null
          current_stage?: string
          dropped_reason?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calling_processes_calling_candidate_id_fkey"
            columns: ["calling_candidate_id"]
            isOneToOne: false
            referencedRelation: "calling_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_processes_calling_id_fkey"
            columns: ["calling_id"]
            isOneToOne: false
            referencedRelation: "calling_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_processes_calling_id_fkey"
            columns: ["calling_id"]
            isOneToOne: false
            referencedRelation: "callings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_processes_candidate_name_id_fkey"
            columns: ["candidate_name_id"]
            isOneToOne: false
            referencedRelation: "candidate_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_processes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      callings: {
        Row: {
          created_at: string | null
          created_by: string | null
          filled_at: string | null
          filled_by: string | null
          id: string
          is_filled: boolean | null
          organization: string | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          filled_at?: string | null
          filled_by?: string | null
          id?: string
          is_filled?: boolean | null
          organization?: string | null
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          filled_at?: string | null
          filled_by?: string | null
          id?: string
          is_filled?: boolean | null
          organization?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "callings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callings_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "candidate_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_names: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_names_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_names_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          category: string
          created_at: string | null
          default_duration_minutes: number | null
          description: string | null
          has_rich_text: boolean | null
          hymn_number: number | null
          icon: string | null
          id: string
          is_core: boolean | null
          is_custom: boolean | null
          is_deprecated: boolean | null
          is_hymn: boolean | null
          name: string
          order_hint: number | null
          requires_assignee: boolean | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          has_rich_text?: boolean | null
          hymn_number?: number | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          is_custom?: boolean | null
          is_deprecated?: boolean | null
          is_hymn?: boolean | null
          name: string
          order_hint?: number | null
          requires_assignee?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          has_rich_text?: boolean | null
          hymn_number?: number | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          is_custom?: boolean | null
          is_deprecated?: boolean | null
          is_hymn?: boolean | null
          name?: string
          order_hint?: number | null
          requires_assignee?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      directory: {
        Row: {
          created_at: string | null
          created_by: string | null
          gender: string | null
          id: string
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gender?: string | null
          id?: string
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gender?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_tag_assignments: {
        Row: {
          created_at: string
          directory_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          directory_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          directory_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_tag_assignments_directory_id_fkey"
            columns: ["directory_id"]
            isOneToOne: false
            referencedRelation: "directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "directory_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_activities: {
        Row: {
          activity_type: string
          created_at: string
          details: Json | null
          discussion_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          details?: Json | null
          discussion_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          details?: Json | null
          discussion_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_activities_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussion_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_activities_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_item_library: {
        Row: {
          created_at: string | null
          created_by: string | null
          estimated_time: number | null
          id: string
          notes_template: string | null
          tags: string[] | null
          topic: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          estimated_time?: number | null
          id?: string
          notes_template?: string | null
          tags?: string[] | null
          topic: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          estimated_time?: number | null
          id?: string
          notes_template?: string | null
          tags?: string[] | null
          topic?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_item_library_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          discussion_id: string
          id: string
          meeting_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          discussion_id: string
          id?: string
          meeting_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          discussion_id?: string
          id?: string
          meeting_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_notes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussion_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_notes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_templates: {
        Row: {
          discussion_id: string
          template_id: string
        }
        Insert: {
          discussion_id: string
          template_id: string
        }
        Update: {
          discussion_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_templates_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussion_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_templates_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          deferred_reason: string | null
          description: string | null
          due_date: string | null
          id: string
          parent_discussion_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string | null
          workspace_discussion_id: string | null
          workspace_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          deferred_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_discussion_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string | null
          workspace_discussion_id?: string | null
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          deferred_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          parent_discussion_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string | null
          workspace_discussion_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_organization_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_parent_discussion_id_fkey"
            columns: ["parent_discussion_id"]
            isOneToOne: false
            referencedRelation: "discussion_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_parent_discussion_id_fkey"
            columns: ["parent_discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_columns: {
        Row: {
          config: Json
          created_at: string
          default_value: Json | null
          deleted_at: string | null
          id: string
          is_required: boolean
          name: string
          position: number
          table_id: string
          type: Database["public"]["Enums"]["column_type_enum"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          default_value?: Json | null
          deleted_at?: string | null
          id?: string
          is_required?: boolean
          name: string
          position?: number
          table_id: string
          type?: Database["public"]["Enums"]["column_type_enum"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          default_value?: Json | null
          deleted_at?: string | null
          id?: string
          is_required?: boolean
          name?: string
          position?: number
          table_id?: string
          type?: Database["public"]["Enums"]["column_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_columns_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dynamic_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_rows: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          form_submission_id: string | null
          id: string
          position: number
          table_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          form_submission_id?: string | null
          id?: string
          position?: number
          table_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          form_submission_id?: string | null
          id?: string
          position?: number
          table_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_rows_form_submission_id_fkey"
            columns: ["form_submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_rows_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dynamic_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_rows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_tables: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          linked_form_id: string | null
          name: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          linked_form_id?: string | null
          name: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          linked_form_id?: string | null
          name?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_tables_linked_form_id_fkey"
            columns: ["linked_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_tables_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_views: {
        Row: {
          column_widths: Json
          created_at: string
          created_by: string | null
          filters: Json
          id: string
          is_default: boolean
          name: string
          sorts: Json
          table_id: string
          updated_at: string
          visible_columns: string[]
        }
        Insert: {
          column_widths?: Json
          created_at?: string
          created_by?: string | null
          filters?: Json
          id?: string
          is_default?: boolean
          name: string
          sorts?: Json
          table_id: string
          updated_at?: string
          visible_columns?: string[]
        }
        Update: {
          column_widths?: Json
          created_at?: string
          created_by?: string | null
          filters?: Json
          id?: string
          is_default?: boolean
          name?: string
          sorts?: Json
          table_id?: string
          updated_at?: string
          visible_columns?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_views_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dynamic_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      event_designs: {
        Row: {
          canva_design_id: string
          canva_edit_url: string | null
          created_at: string | null
          created_by: string | null
          edit_url_expires_at: string | null
          event_id: string
          export_job_id: string | null
          export_status: string | null
          height: number | null
          id: string
          public_url: string | null
          storage_path: string | null
          title: string
          updated_at: string | null
          width: number | null
          workspace_id: string
        }
        Insert: {
          canva_design_id: string
          canva_edit_url?: string | null
          created_at?: string | null
          created_by?: string | null
          edit_url_expires_at?: string | null
          event_id: string
          export_job_id?: string | null
          export_status?: string | null
          height?: number | null
          id?: string
          public_url?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string | null
          width?: number | null
          workspace_id: string
        }
        Update: {
          canva_design_id?: string
          canva_edit_url?: string | null
          created_at?: string | null
          created_by?: string | null
          edit_url_expires_at?: string | null
          event_id?: string
          export_job_id?: string | null
          export_status?: string | null
          height?: number | null
          id?: string
          public_url?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string | null
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_designs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_designs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_tbd: boolean
          description: string | null
          duration_minutes: number | null
          duration_mode: string
          end_at: string
          event_type: string
          external_source_id: string | null
          external_source_type: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          start_at: string
          time_tbd: boolean
          title: string
          updated_at: string | null
          workspace_event_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_tbd?: boolean
          description?: string | null
          duration_minutes?: number | null
          duration_mode?: string
          end_at: string
          event_type?: string
          external_source_id?: string | null
          external_source_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          start_at: string
          time_tbd?: boolean
          title: string
          updated_at?: string | null
          workspace_event_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_tbd?: boolean
          description?: string | null
          duration_minutes?: number | null
          duration_mode?: string
          end_at?: string
          event_type?: string
          external_source_id?: string | null
          external_source_type?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          start_at?: string
          time_tbd?: boolean
          title?: string
          updated_at?: string | null
          workspace_event_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendar_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          external_uid: string
          id: string
          is_all_day: boolean | null
          location: string | null
          raw_ical: string | null
          start_date: string
          subscription_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          external_uid: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          raw_ical?: string | null
          start_date: string
          subscription_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          external_uid?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          raw_ical?: string | null
          start_date?: string
          subscription_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "calendar_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_event_links: {
        Row: {
          announcement_id: string | null
          created_at: string | null
          external_event_id: string | null
          id: string
        }
        Insert: {
          announcement_id?: string | null
          created_at?: string | null
          external_event_id?: string | null
          id?: string
        }
        Update: {
          announcement_id?: string | null
          created_at?: string | null
          external_event_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_event_links_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: true
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_event_links_external_event_id_fkey"
            columns: ["external_event_id"]
            isOneToOne: true
            referencedRelation: "external_calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          data: Json
          form_id: string
          id: string
          submitted_at: string
        }
        Insert: {
          data?: Json
          form_id: string
          id?: string
          submitted_at?: string
        }
        Update: {
          data?: Json
          form_id?: string
          id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_view_analytics: {
        Row: {
          form_id: string
          id: string
          view_count: number
          view_date: string
        }
        Insert: {
          form_id: string
          id?: string
          view_count?: number
          view_date: string
        }
        Update: {
          form_id?: string
          id?: string
          view_count?: number
          view_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_view_analytics_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          schema: Json
          slug: string
          title: string
          updated_at: string
          views_count: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          schema?: Json
          slug: string
          title: string
          updated_at?: string
          views_count?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          schema?: Json
          slug?: string
          title?: string
          updated_at?: string
          views_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_template_categories: {
        Row: {
          category_name: string
          created_at: string | null
          id: string
          workspace_id: string
        }
        Insert: {
          category_name: string
          created_at?: string | null
          id?: string
          workspace_id: string
        }
        Update: {
          category_name?: string
          created_at?: string | null
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_template_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hymns: {
        Row: {
          book_id: string
          created_at: string | null
          hymn_number: number
          id: string
          language: string
          title: string
          topic: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          hymn_number: number
          id?: string
          language?: string
          title: string
          topic?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          hymn_number?: number
          id?: string
          language?: string
          title?: string
          topic?: string | null
        }
        Relationships: []
      }
      invite_validation_attempts: {
        Row: {
          attempted_at: string | null
          attempted_code: string | null
          id: string
          ip_address: string
          was_successful: boolean | null
        }
        Insert: {
          attempted_at?: string | null
          attempted_code?: string | null
          id?: string
          ip_address: string
          was_successful?: boolean | null
        }
        Update: {
          attempted_at?: string | null
          attempted_code?: string | null
          id?: string
          ip_address?: string
          was_successful?: boolean | null
        }
        Relationships: []
      }
      meeting_assignments: {
        Row: {
          agenda_item_id: string | null
          assignment_type: string
          created_at: string | null
          created_by: string | null
          directory_id: string
          id: string
          is_confirmed: boolean | null
          meeting_id: string | null
          topic: string | null
          updated_at: string | null
          workspace_id: string
          workspace_speaker_id: string | null
        }
        Insert: {
          agenda_item_id?: string | null
          assignment_type: string
          created_at?: string | null
          created_by?: string | null
          directory_id: string
          id?: string
          is_confirmed?: boolean | null
          meeting_id?: string | null
          topic?: string | null
          updated_at?: string | null
          workspace_id: string
          workspace_speaker_id?: string | null
        }
        Update: {
          agenda_item_id?: string | null
          assignment_type?: string
          created_at?: string | null
          created_by?: string | null
          directory_id?: string
          id?: string
          is_confirmed?: boolean | null
          meeting_id?: string | null
          topic?: string | null
          updated_at?: string | null
          workspace_id?: string
          workspace_speaker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_assignments_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_assignments_directory_id_fkey"
            columns: ["directory_id"]
            isOneToOne: false
            referencedRelation: "directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_assignments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_share_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          meeting_id: string
          permission: string
          status: string
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          meeting_id: string
          permission: string
          status?: string
          token?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          meeting_id?: string
          permission?: string
          status?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_share_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_share_invitations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_share_settings: {
        Row: {
          allow_notes_export: boolean | null
          created_at: string | null
          custom_message: string | null
          meeting_id: string
          show_duration_estimates: boolean | null
          show_presenter_names: boolean | null
          updated_at: string | null
        }
        Insert: {
          allow_notes_export?: boolean | null
          created_at?: string | null
          custom_message?: string | null
          meeting_id: string
          show_duration_estimates?: boolean | null
          show_presenter_names?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allow_notes_export?: boolean | null
          created_at?: string | null
          custom_message?: string | null
          meeting_id?: string
          show_duration_estimates?: boolean | null
          show_presenter_names?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_share_settings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_share_views: {
        Row: {
          country_code: string | null
          created_at: string | null
          first_viewed_at: string | null
          id: string
          last_viewed_at: string | null
          meeting_id: string
          referrer: string | null
          user_agent: string | null
          view_count: number | null
          visitor_fingerprint: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          meeting_id: string
          referrer?: string | null
          user_agent?: string | null
          view_count?: number | null
          visitor_fingerprint: string
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          meeting_id?: string
          referrer?: string | null
          user_agent?: string | null
          view_count?: number | null
          visitor_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_share_views_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_shares: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          permission: string
          recipient_email: string
          recipient_user_id: string | null
          shared_by: string
          sharing_group_id: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          permission: string
          recipient_email: string
          recipient_user_id?: string | null
          shared_by: string
          sharing_group_id?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          permission?: string
          recipient_email?: string
          recipient_user_id?: string | null
          shared_by?: string
          sharing_group_id?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_shares_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_shares_sharing_group_id_fkey"
            columns: ["sharing_group_id"]
            isOneToOne: false
            referencedRelation: "sharing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          attendance_count: number | null
          chorister_name: string | null
          conducting_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string | null
          external_plan_url: string | null
          id: string
          is_legacy: boolean
          is_publicly_shared: boolean | null
          markdown_agenda: string | null
          modality: Database["public"]["Enums"]["meeting_modality"] | null
          notes: Json | null
          organist_name: string | null
          plan_type: Database["public"]["Enums"]["meeting_plan_type"] | null
          presiding_name: string | null
          program_style: Json | null
          public_share_token: string | null
          scheduled_date: string
          share_uuid: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string | null
          workspace_id: string | null
          workspace_meeting_id: string | null
          zoom_join_url: string | null
          zoom_meeting_id: string | null
          zoom_passcode: string | null
          zoom_start_url: string | null
        }
        Insert: {
          attendance_count?: number | null
          chorister_name?: string | null
          conducting_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          external_plan_url?: string | null
          id?: string
          is_legacy?: boolean
          is_publicly_shared?: boolean | null
          markdown_agenda?: string | null
          modality?: Database["public"]["Enums"]["meeting_modality"] | null
          notes?: Json | null
          organist_name?: string | null
          plan_type?: Database["public"]["Enums"]["meeting_plan_type"] | null
          presiding_name?: string | null
          program_style?: Json | null
          public_share_token?: string | null
          scheduled_date: string
          share_uuid?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string | null
          workspace_id?: string | null
          workspace_meeting_id?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          attendance_count?: number | null
          chorister_name?: string | null
          conducting_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          external_plan_url?: string | null
          id?: string
          is_legacy?: boolean
          is_publicly_shared?: boolean | null
          markdown_agenda?: string | null
          modality?: Database["public"]["Enums"]["meeting_modality"] | null
          notes?: Json | null
          organist_name?: string | null
          plan_type?: Database["public"]["Enums"]["meeting_plan_type"] | null
          presiding_name?: string | null
          program_style?: Json | null
          public_share_token?: string | null
          scheduled_date?: string
          share_uuid?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
          workspace_meeting_id?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          zoom_start_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      note_associations: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          note_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          note_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_associations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          cover_style: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          cover_style?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          cover_style?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: Json
          created_at: string | null
          created_by: string
          id: string
          is_personal: boolean
          notebook_id: string | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          content?: Json
          created_at?: string | null
          created_by: string
          id?: string
          is_personal?: boolean
          notebook_id?: string | null
          title?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_personal?: boolean
          notebook_id?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          email_frequency: string
          id: string
          in_app_enabled: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          email_frequency?: string
          id?: string
          in_app_enabled?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          email_frequency?: string
          id?: string
          in_app_enabled?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          digest_sent_at: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          digest_sent_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          digest_sent_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_assignments: {
        Row: {
          assignable_id: string
          assignable_type: string
          assignee_id: string | null
          assignee_name: string | null
          assignee_type: Database["public"]["Enums"]["assignee_type"]
          created_at: string | null
          id: string
          is_confirmed: boolean | null
          role: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assignable_id: string
          assignable_type: string
          assignee_id?: string | null
          assignee_name?: string | null
          assignee_type: Database["public"]["Enums"]["assignee_type"]
          created_at?: string | null
          id?: string
          is_confirmed?: boolean | null
          role?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assignable_id?: string
          assignable_type?: string
          assignee_id?: string | null
          assignee_name?: string | null
          assignee_type?: Database["public"]["Enums"]["assignee_type"]
          created_at?: string | null
          id?: string
          is_confirmed?: boolean | null
          role?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_invitations: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          max_uses: number
          status: string
          updated_at: string | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          status?: string
          updated_at?: string | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          status?: string
          updated_at?: string | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      procedural_item_types: {
        Row: {
          category: string | null
          created_at: string | null
          default_duration_minutes: number | null
          description: string | null
          has_rich_text: boolean | null
          hymn_number: number | null
          icon: string | null
          icon_name: string | null
          id: string
          is_custom: boolean | null
          is_deprecated: boolean | null
          is_hymn: boolean | null
          name: string
          order_hint: number | null
          requires_assignee: boolean | null
          requires_participant: boolean | null
          requires_resource: boolean | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          has_rich_text?: boolean | null
          hymn_number?: number | null
          icon?: string | null
          icon_name?: string | null
          id: string
          is_custom?: boolean | null
          is_deprecated?: boolean | null
          is_hymn?: boolean | null
          name: string
          order_hint?: number | null
          requires_assignee?: boolean | null
          requires_participant?: boolean | null
          requires_resource?: boolean | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          has_rich_text?: boolean | null
          hymn_number?: number | null
          icon?: string | null
          icon_name?: string | null
          id?: string
          is_custom?: boolean | null
          is_deprecated?: boolean | null
          is_hymn?: boolean | null
          name?: string
          order_hint?: number | null
          requires_assignee?: boolean | null
          requires_participant?: boolean | null
          requires_resource?: boolean | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedural_item_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string
          feature_interests: Json | null
          feature_tier: string | null
          full_name: string
          id: string
          is_deleted: boolean | null
          is_sys_admin: boolean | null
          language_preference: string
          last_read_release_note_at: string | null
          locale: string | null
          platform_invitation_id: string | null
          role: string
          role_title: string | null
          terms_version_acknowledged: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email: string
          feature_interests?: Json | null
          feature_tier?: string | null
          full_name: string
          id: string
          is_deleted?: boolean | null
          is_sys_admin?: boolean | null
          language_preference?: string
          last_read_release_note_at?: string | null
          locale?: string | null
          platform_invitation_id?: string | null
          role: string
          role_title?: string | null
          terms_version_acknowledged?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          feature_interests?: Json | null
          feature_tier?: string | null
          full_name?: string
          id?: string
          is_deleted?: boolean | null
          is_sys_admin?: boolean | null
          language_preference?: string
          last_read_release_note_at?: string | null
          locale?: string | null
          platform_invitation_id?: string | null
          role?: string
          role_title?: string | null
          terms_version_acknowledged?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_platform_invitation_id_fkey"
            columns: ["platform_invitation_id"]
            isOneToOne: false
            referencedRelation: "platform_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      release_notes: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          status: Database["public"]["Enums"]["release_note_status"]
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["release_note_status"]
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["release_note_status"]
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      sacrament_planner_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          meeting_date: string
          meeting_state: Json
          meeting_type_overridden: boolean
          notes_state: Json
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_date: string
          meeting_state?: Json
          meeting_type_overridden?: boolean
          notes_state?: Json
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_date?: string
          meeting_state?: Json
          meeting_type_overridden?: boolean
          notes_state?: Json
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sacrament_planner_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_library: {
        Row: {
          catalog_item_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_time: number | null
          id: string
          segment_type:
            | Database["public"]["Enums"]["program_segment_type"]
            | null
          tags: string[] | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_time?: number | null
          id?: string
          segment_type?:
            | Database["public"]["Enums"]["program_segment_type"]
            | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_time?: number | null
          id?: string
          segment_type?:
            | Database["public"]["Enums"]["program_segment_type"]
            | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_library_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_library_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      share_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          performed_by: string
          sharing_group_id: string | null
          target_email: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          performed_by: string
          sharing_group_id?: string | null
          target_email?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          performed_by?: string
          sharing_group_id?: string | null
          target_email?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_activity_log_sharing_group_id_fkey"
            columns: ["sharing_group_id"]
            isOneToOne: false
            referencedRelation: "sharing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_group_members: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          group_id: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          group_id: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sharing_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "sharing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sharing_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          created_at: string | null
          id: string
          label_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          access_token: string | null
          agenda_item_id: string | null
          assigned_to: string | null
          business_item_id: string | null
          calling_process_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          discussion_id: string | null
          due_date: string | null
          id: string
          meeting_id: string | null
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          workspace_id: string | null
          workspace_task_id: string | null
        }
        Insert: {
          access_token?: string | null
          agenda_item_id?: string | null
          assigned_to?: string | null
          business_item_id?: string | null
          calling_process_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discussion_id?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          workspace_id?: string | null
          workspace_task_id?: string | null
        }
        Update: {
          access_token?: string | null
          agenda_item_id?: string | null
          assigned_to?: string | null
          business_item_id?: string | null
          calling_process_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discussion_id?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
          workspace_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_business_item_id_fkey"
            columns: ["business_item_id"]
            isOneToOne: false
            referencedRelation: "business_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_calling_process_id_fkey"
            columns: ["calling_process_id"]
            isOneToOne: false
            referencedRelation: "calling_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussion_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          hymn_id: string | null
          hymn_number: number | null
          hymn_title: string | null
          id: string
          item_notes: string | null
          item_type: Database["public"]["Enums"]["agenda_item_type"]
          order_index: number
          procedural_item_type_id: string | null
          structural_type: string | null
          template_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          hymn_id?: string | null
          hymn_number?: number | null
          hymn_title?: string | null
          id?: string
          item_notes?: string | null
          item_type?: Database["public"]["Enums"]["agenda_item_type"]
          order_index: number
          procedural_item_type_id?: string | null
          structural_type?: string | null
          template_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          hymn_id?: string | null
          hymn_number?: number | null
          hymn_title?: string | null
          id?: string
          item_notes?: string | null
          item_type?: Database["public"]["Enums"]["agenda_item_type"]
          order_index?: number
          procedural_item_type_id?: string | null
          structural_type?: string | null
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_items_hymn_id_fkey"
            columns: ["hymn_id"]
            isOneToOne: false
            referencedRelation: "hymns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_items_procedural_item_type_id_fkey"
            columns: ["procedural_item_type_id"]
            isOneToOne: false
            referencedRelation: "procedural_item_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          calling_type: string | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          defaults: Json | null
          description: string | null
          folder_id: string | null
          id: string
          is_active: boolean | null
          is_public: boolean
          metadata: Json | null
          name: string
          slug: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          tags: string[] | null
          template_kind: string | null
          template_schema_version: number | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
          visibility: string | null
          workspace_id: string | null
        }
        Insert: {
          calling_type?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          defaults?: Json | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          metadata?: Json | null
          name: string
          slug?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          tags?: string[] | null
          template_kind?: string | null
          template_schema_version?: number | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          visibility?: string | null
          workspace_id?: string | null
        }
        Update: {
          calling_type?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          defaults?: Json | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          metadata?: Json | null
          name?: string
          slug?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          tags?: string[] | null
          template_kind?: string | null
          template_schema_version?: number | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          visibility?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          agenda_item_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          meeting_id: string
          started_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          meeting_id: string
          started_at: string
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          meeting_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_name: string | null
          device_token: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_token: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_token?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          href: string
          parent_title: string | null
          position: number
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          href: string
          parent_title?: string | null
          position?: number
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          href?: string
          parent_title?: string | null
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recent_items: {
        Row: {
          entity_id: string
          entity_type: string
          href: string
          last_viewed_at: string
          parent_title: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          href: string
          last_viewed_at?: string
          parent_title?: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          href?: string
          last_viewed_at?: string
          parent_title?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recent_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          dashboard_layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_announcement_counters: {
        Row: {
          created_at: string | null
          current_counter: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_announcement_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_apps: {
        Row: {
          app_id: string
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          id: string
          settings: Json | null
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          app_id: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          id?: string
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          app_id?: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          id?: string
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_apps_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_apps_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_apps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_business_counters: {
        Row: {
          created_at: string | null
          current_counter: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_business_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_discussion_counters: {
        Row: {
          created_at: string | null
          current_counter: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_discussion_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_event_counters: {
        Row: {
          counter: number | null
          workspace_id: string
        }
        Insert: {
          counter?: number | null
          workspace_id: string
        }
        Update: {
          counter?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_event_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          status: string
          token: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: string
          status?: string
          token?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_meeting_counters: {
        Row: {
          created_at: string | null
          current_counter: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_meeting_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_speaker_counters: {
        Row: {
          created_at: string | null
          current_counter: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_speaker_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_task_counters: {
        Row: {
          created_at: string | null
          current_counter: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_task_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          mfa_required: boolean
          name: string
          organization_type: string
          slug: string | null
          type: string
          unit_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mfa_required?: boolean
          name: string
          organization_type?: string
          slug?: string | null
          type: string
          unit_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mfa_required?: boolean
          name?: string
          organization_type?: string
          slug?: string | null
          type?: string
          unit_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      calling_summary: {
        Row: {
          active_process_count: number | null
          candidate_count: number | null
          created_at: string | null
          created_by: string | null
          filled_at: string | null
          filled_by: string | null
          filled_by_name: string | null
          id: string | null
          is_filled: boolean | null
          organization: string | null
          title: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "callings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callings_filled_by_fkey"
            columns: ["filled_by"]
            isOneToOne: false
            referencedRelation: "candidate_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_summary: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          deferred_reason: string | null
          description: string | null
          due_date: string | null
          id: string | null
          meeting_count: number | null
          note_count: number | null
          organization_id: string | null
          priority: string | null
          status: string | null
          task_count: number | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anonymize_user_account: {
        Args: { target_user_id: string }
        Returns: Json
      }
      assign_plan_participant: {
        Args: {
          p_assignable_id: string
          p_assignable_type: string
          p_assignee_id?: string
          p_assignee_name?: string
          p_assignee_type: Database["public"]["Enums"]["assignee_type"]
          p_role?: string
        }
        Returns: string
      }
      create_agenda_plan: {
        Args: {
          p_description?: string
          p_discussion_items?: Json
          p_meeting_id: string
          p_objectives?: Json
          p_title: string
        }
        Returns: string
      }
      create_event_and_meeting:
        | {
            Args: {
              p_event_description?: string
              p_event_end_at: string
              p_event_is_all_day?: boolean
              p_event_location?: string
              p_event_start_at: string
              p_event_title: string
              p_meeting_plan_type?: Database["public"]["Enums"]["meeting_plan_type"]
              p_meeting_title?: string
              p_template_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_event_description?: string
              p_event_end_at: string
              p_event_is_all_day?: boolean
              p_event_location?: string
              p_event_start_at: string
              p_event_title: string
              p_meeting_modality?: Database["public"]["Enums"]["meeting_modality"]
              p_meeting_plan_type?: Database["public"]["Enums"]["meeting_plan_type"]
              p_meeting_title?: string
              p_template_id?: string
            }
            Returns: Json
          }
      create_meeting_draft_with_agenda: {
        Args: {
          p_agenda_items?: Json
          p_notes?: Json
          p_scheduled_date: string
          p_template_id: string
          p_title: string
        }
        Returns: string
      }
      create_meeting_from_template: {
        Args: {
          p_scheduled_date: string
          p_template_id: string
          p_title: string
        }
        Returns: string
      }
      create_meeting_with_agenda:
        | {
            Args: {
              p_agenda_items?: Json
              p_scheduled_date: string
              p_template_id: string
              p_title: string
            }
            Returns: string
          }
        | {
            Args: {
              p_agenda_items?: Json
              p_notes?: Json
              p_scheduled_date: string
              p_template_id: string
              p_title: string
            }
            Returns: string
          }
      create_platform_invitation: {
        Args: {
          p_description?: string
          p_expires_in_days?: number
          p_max_uses?: number
        }
        Returns: {
          code: string
          expires_at: string
          id: string
          max_uses: number
        }[]
      }
      create_program_plan: {
        Args: {
          p_description?: string
          p_meeting_id: string
          p_segments?: Json
          p_style_config?: Json
          p_title: string
        }
        Returns: string
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_slug: { Args: { name: string }; Returns: string }
      get_auth_role: { Args: never; Returns: string }
      get_auth_workspace_id: { Args: never; Returns: string }
      get_meeting_share_analytics: {
        Args: { p_meeting_id: string }
        Returns: Json
      }
      instantiate_template_as_plan: {
        Args: { p_meeting_id: string; p_template_id: string }
        Returns: string
      }
      is_sys_admin: { Args: never; Returns: boolean }
      link_meeting_to_event: {
        Args: {
          p_event_id: string
          p_meeting_title?: string
          p_plan_type?: Database["public"]["Enums"]["meeting_plan_type"]
          p_template_id?: string
        }
        Returns: string
      }
      link_shares_to_new_user: {
        Args: { p_user_email: string; p_user_id: string }
        Returns: number
      }
      link_task_to_discussion_item: {
        Args: { p_discussion_item_id: string; p_task_id: string }
        Returns: undefined
      }
      rebuild_legacy_meeting: {
        Args: {
          p_legacy_meeting_id: string
          p_target_plan_type?: Database["public"]["Enums"]["meeting_plan_type"]
        }
        Returns: Json
      }
      update_agenda_plan: {
        Args: {
          p_agenda_document_id: string
          p_description?: string
          p_discussion_items?: Json
          p_objectives?: Json
          p_status?: Database["public"]["Enums"]["plan_document_status"]
          p_title?: string
        }
        Returns: string
      }
      update_meeting_with_agenda:
        | {
            Args: {
              p_agenda_items?: Json
              p_meeting_id: string
              p_scheduled_date: string
              p_title: string
            }
            Returns: string
          }
        | {
            Args: {
              p_agenda_items?: Json
              p_meeting_id: string
              p_notes?: Json
              p_scheduled_date: string
              p_title: string
            }
            Returns: string
          }
      update_program_plan: {
        Args: {
          p_description?: string
          p_program_document_id: string
          p_segments?: Json
          p_status?: Database["public"]["Enums"]["plan_document_status"]
          p_style_config?: Json
          p_title?: string
        }
        Returns: string
      }
      user_workspace_id: { Args: never; Returns: string }
      validate_and_consume_invite_code: {
        Args: { p_code: string; p_ip_address?: string }
        Returns: {
          error_message: string
          invitation_id: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      agenda_item_type:
        | "procedural"
        | "discussion"
        | "business"
        | "announcement"
        | "speaker"
        | "structural"
      assignee_type: "member" | "participant" | "speaker" | "external"
      column_type_enum:
        | "text"
        | "number"
        | "select"
        | "multi_select"
        | "date"
        | "datetime"
        | "checkbox"
        | "user_link"
        | "table_link"
      hymn_book_type:
        | "hymns_church"
        | "hymns_home_church"
        | "childrens_songbook"
        | "himnos_iglesia"
        | "himnos_hogar_iglesia"
      meeting_modality: "online" | "in_person" | "hybrid"
      meeting_plan_type: "agenda" | "program" | "external"
      plan_document_status: "draft" | "finalized" | "archived"
      program_segment_type:
        | "prayer"
        | "hymn"
        | "spiritual_thought"
        | "business"
        | "speaker"
        | "musical_number"
        | "rest_hymn"
        | "custom"
        | "sacrament"
        | "welcome"
        | "closing"
        | "announcement"
      release_note_status: "draft" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agenda_item_type: [
        "procedural",
        "discussion",
        "business",
        "announcement",
        "speaker",
        "structural",
      ],
      assignee_type: ["member", "participant", "speaker", "external"],
      column_type_enum: [
        "text",
        "number",
        "select",
        "multi_select",
        "date",
        "datetime",
        "checkbox",
        "user_link",
        "table_link",
      ],
      hymn_book_type: [
        "hymns_church",
        "hymns_home_church",
        "childrens_songbook",
        "himnos_iglesia",
        "himnos_hogar_iglesia",
      ],
      meeting_modality: ["online", "in_person", "hybrid"],
      meeting_plan_type: ["agenda", "program", "external"],
      plan_document_status: ["draft", "finalized", "archived"],
      program_segment_type: [
        "prayer",
        "hymn",
        "spiritual_thought",
        "business",
        "speaker",
        "musical_number",
        "rest_hymn",
        "custom",
        "sacrament",
        "welcome",
        "closing",
        "announcement",
      ],
      release_note_status: ["draft", "published"],
    },
  },
} as const
