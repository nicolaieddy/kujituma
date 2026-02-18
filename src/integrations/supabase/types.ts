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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accountability_check_ins: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          initiated_by: string
          message: string | null
          partnership_id: string
          reply_to_id: string | null
          week_start: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          initiated_by: string
          message?: string | null
          partnership_id: string
          reply_to_id?: string | null
          week_start: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          initiated_by?: string
          message?: string | null
          partnership_id?: string
          reply_to_id?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_check_ins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "accountability_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_check_ins_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_check_ins_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_check_ins_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "accountability_check_ins"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "accountability_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      accountability_partner_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_can_view_sender_goals: boolean
          receiver_id: string
          sender_can_view_receiver_goals: boolean
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_can_view_sender_goals?: boolean
          receiver_id: string
          sender_can_view_receiver_goals?: boolean
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_can_view_sender_goals?: boolean
          receiver_id?: string
          sender_can_view_receiver_goals?: boolean
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_partner_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partner_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_partnerships: {
        Row: {
          check_in_frequency: string
          created_at: string
          id: string
          last_check_in_at: string | null
          my_check_in_cadence_user1: string | null
          my_check_in_cadence_user2: string | null
          status: string
          updated_at: string
          user1_can_view_user2_goals: boolean
          user1_id: string
          user2_can_view_user1_goals: boolean
          user2_id: string
        }
        Insert: {
          check_in_frequency?: string
          created_at?: string
          id?: string
          last_check_in_at?: string | null
          my_check_in_cadence_user1?: string | null
          my_check_in_cadence_user2?: string | null
          status?: string
          updated_at?: string
          user1_can_view_user2_goals?: boolean
          user1_id: string
          user2_can_view_user1_goals?: boolean
          user2_id: string
        }
        Update: {
          check_in_frequency?: string
          created_at?: string
          id?: string
          last_check_in_at?: string | null
          my_check_in_cadence_user1?: string | null
          my_check_in_cadence_user2?: string | null
          status?: string
          updated_at?: string
          user1_can_view_user2_goals?: boolean
          user1_id?: string
          user2_can_view_user1_goals?: boolean
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_partnerships_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partnerships_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_mappings: {
        Row: {
          created_at: string | null
          goal_id: string
          habit_item_id: string
          id: string
          integration_type: string
          min_duration_minutes: number | null
          strava_activity_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          goal_id: string
          habit_item_id: string
          id?: string
          integration_type?: string
          min_duration_minutes?: number | null
          strava_activity_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          goal_id?: string
          habit_item_id?: string
          id?: string
          integration_type?: string
          min_duration_minutes?: number | null
          strava_activity_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_mappings_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          id: string
          request_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_type?: string
          user_id?: string
        }
        Relationships: []
      }
      carry_over_logs: {
        Row: {
          created_at: string
          goal_id: string | null
          goal_title: string | null
          id: string
          objective_id: string
          objective_text: string
          source_week_start: string
          target_week_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id?: string | null
          goal_title?: string | null
          id?: string
          objective_id: string
          objective_text: string
          source_week_start: string
          target_week_start: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string | null
          goal_title?: string | null
          id?: string
          objective_id?: string
          objective_text?: string
          source_week_start?: string
          target_week_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carry_over_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      check_in_custom_questions: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          order_index: number
          prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          order_index?: number
          prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          order_index?: number
          prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      check_in_reactions: {
        Row: {
          check_in_id: string
          created_at: string
          id: string
          partnership_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          check_in_id: string
          created_at?: string
          id?: string
          partnership_id: string
          reaction: string
          user_id: string
        }
        Update: {
          check_in_id?: string
          created_at?: string
          id?: string
          partnership_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_in_reactions_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "accountability_check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_reactions_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          id: string
          likes: number | null
          message: string
          name: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          likes?: number | null
          message: string
          name: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          likes?: number | null
          message?: string
          name?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_goal_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_check_ins: {
        Row: {
          blocker: string | null
          check_in_date: string
          created_at: string
          custom_answers: Json | null
          energy_level: number | null
          focus_today: string | null
          id: string
          journal_entry: string | null
          mood_rating: number | null
          quick_win: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocker?: string | null
          check_in_date?: string
          created_at?: string
          custom_answers?: Json | null
          energy_level?: number | null
          focus_today?: string | null
          id?: string
          journal_entry?: string | null
          mood_rating?: number | null
          quick_win?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocker?: string | null
          check_in_date?: string
          created_at?: string
          custom_answers?: Json | null
          energy_level?: number | null
          focus_today?: string | null
          id?: string
          journal_entry?: string | null
          mood_rating?: number | null
          quick_win?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dismissed_carryover_objectives: {
        Row: {
          dismissed_at: string
          goal_id: string | null
          id: string
          objective_text: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          goal_id?: string | null
          id?: string
          objective_text: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          goal_id?: string | null
          id?: string
          objective_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_carryover_objectives_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      duolingo_connections: {
        Row: {
          created_at: string
          current_streak: number | null
          display_name: string | null
          duolingo_username: string
          id: string
          last_synced_at: string | null
          total_xp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          duolingo_username: string
          id?: string
          last_synced_at?: string | null
          total_xp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          duolingo_username?: string
          id?: string
          last_synced_at?: string | null
          total_xp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      goal_comments: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_comments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_follows: {
        Row: {
          created_at: string
          follower_user_id: string
          goal_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          goal_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_follows_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_status_history: {
        Row: {
          changed_at: string
          goal_id: string
          id: string
          new_status: string
          old_status: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          goal_id: string
          id?: string
          new_status: string
          old_status?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          goal_id?: string
          id?: string
          new_status?: string
          old_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_status_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_status_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_update_cheers: {
        Row: {
          cheer_type: string
          created_at: string
          id: string
          message: string | null
          update_id: string
          user_id: string
        }
        Insert: {
          cheer_type?: string
          created_at?: string
          id?: string
          message?: string | null
          update_id: string
          user_id: string
        }
        Update: {
          cheer_type?: string
          created_at?: string
          id?: string
          message?: string | null
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_update_cheers_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "goal_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_update_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_update_comments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "goal_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_updates: {
        Row: {
          content: string | null
          created_at: string
          goal_id: string
          id: string
          milestone_type: string | null
          objectives_snapshot: Json | null
          update_type: string
          user_id: string
          week_start: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          goal_id: string
          id?: string
          milestone_type?: string | null
          objectives_snapshot?: Json | null
          update_type: string
          user_id: string
          week_start?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          milestone_type?: string | null
          objectives_snapshot?: Json | null
          update_type?: string
          user_id?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_updates_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          carry_over_resolved_year: number | null
          category: string | null
          completed_at: string | null
          created_at: string
          deprioritized_at: string | null
          description: string | null
          habit_items: Json | null
          id: string
          is_paused: boolean
          is_recurring: boolean
          notes: string | null
          order_index: number | null
          paused_at: string | null
          recurrence_frequency: string | null
          recurring_objective_text: string | null
          start_date: string | null
          status: string
          target_date: string | null
          timeframe: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          carry_over_resolved_year?: number | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deprioritized_at?: string | null
          description?: string | null
          habit_items?: Json | null
          id?: string
          is_paused?: boolean
          is_recurring?: boolean
          notes?: string | null
          order_index?: number | null
          paused_at?: string | null
          recurrence_frequency?: string | null
          recurring_objective_text?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          timeframe: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          carry_over_resolved_year?: number | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deprioritized_at?: string | null
          description?: string | null
          habit_items?: Json | null
          id?: string
          is_paused?: boolean
          is_recurring?: boolean
          notes?: string | null
          order_index?: number | null
          paused_at?: string | null
          recurrence_frequency?: string | null
          recurring_objective_text?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          timeframe?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completion_date: string
          created_at: string
          goal_id: string
          habit_item_id: string
          id: string
          user_id: string
        }
        Insert: {
          completion_date: string
          created_at?: string
          goal_id: string
          habit_item_id: string
          id?: string
          user_id: string
        }
        Update: {
          completion_date?: string
          created_at?: string
          goal_id?: string
          habit_item_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          in_app_accountability_check_in: boolean
          in_app_accountability_partner_accepted: boolean
          in_app_accountability_partner_request: boolean
          in_app_comment_added: boolean
          in_app_comment_like: boolean
          in_app_comment_reaction: boolean
          in_app_friend_request: boolean
          in_app_friend_request_accepted: boolean
          in_app_goal_help_request: boolean
          in_app_goal_milestone: boolean
          in_app_goal_update_cheer: boolean
          in_app_goal_update_comment: boolean
          in_app_mention: boolean
          in_app_partner_objective_feedback: boolean
          in_app_post_like: boolean
          sms_accountability_check_in: boolean
          sms_accountability_partner_accepted: boolean
          sms_accountability_partner_request: boolean
          sms_friend_request: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_app_accountability_check_in?: boolean
          in_app_accountability_partner_accepted?: boolean
          in_app_accountability_partner_request?: boolean
          in_app_comment_added?: boolean
          in_app_comment_like?: boolean
          in_app_comment_reaction?: boolean
          in_app_friend_request?: boolean
          in_app_friend_request_accepted?: boolean
          in_app_goal_help_request?: boolean
          in_app_goal_milestone?: boolean
          in_app_goal_update_cheer?: boolean
          in_app_goal_update_comment?: boolean
          in_app_mention?: boolean
          in_app_partner_objective_feedback?: boolean
          in_app_post_like?: boolean
          sms_accountability_check_in?: boolean
          sms_accountability_partner_accepted?: boolean
          sms_accountability_partner_request?: boolean
          sms_friend_request?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          in_app_accountability_check_in?: boolean
          in_app_accountability_partner_accepted?: boolean
          in_app_accountability_partner_request?: boolean
          in_app_comment_added?: boolean
          in_app_comment_like?: boolean
          in_app_comment_reaction?: boolean
          in_app_friend_request?: boolean
          in_app_friend_request_accepted?: boolean
          in_app_goal_help_request?: boolean
          in_app_goal_milestone?: boolean
          in_app_goal_update_cheer?: boolean
          in_app_goal_update_comment?: boolean
          in_app_mention?: boolean
          in_app_partner_objective_feedback?: boolean
          in_app_post_like?: boolean
          sms_accountability_check_in?: boolean
          sms_accountability_partner_accepted?: boolean
          sms_accountability_partner_request?: boolean
          sms_friend_request?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_comment_id: string | null
          related_objective_id: string | null
          related_post_id: string | null
          related_request_id: string | null
          triggered_by_user_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_comment_id?: string | null
          related_objective_id?: string | null
          related_post_id?: string | null
          related_request_id?: string | null
          triggered_by_user_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_comment_id?: string | null
          related_objective_id?: string | null
          related_post_id?: string | null
          related_request_id?: string | null
          triggered_by_user_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      objective_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "objective_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_comment_reads: {
        Row: {
          id: string
          last_read_at: string
          objective_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          objective_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          objective_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_comment_reads_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "weekly_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_comment_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          objective_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          objective_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          objective_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_comments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "weekly_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_partner_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          objective_id: string
          partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          objective_id: string
          partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          objective_id?: string
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_partner_feedback_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "weekly_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_partner_feedback_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_visibility_history: {
        Row: {
          changed_by: string
          created_at: string
          field_changed: string
          id: string
          new_value: boolean
          old_value: boolean | null
          partnership_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          field_changed: string
          id?: string
          new_value: boolean
          old_value?: boolean | null
          partnership_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: boolean
          old_value?: boolean | null
          partnership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_visibility_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_visibility_history_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verification_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone_number: string
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          accomplishments: string
          completion_percentage: number | null
          created_at: string
          help: string
          hidden: boolean
          id: string
          likes: number | null
          name: string
          objectives_completed: number | null
          priorities: string
          reflection: string | null
          total_objectives: number | null
          updated_at: string
          user_id: string
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          accomplishments?: string
          completion_percentage?: number | null
          created_at?: string
          help?: string
          hidden?: boolean
          id?: string
          likes?: number | null
          name: string
          objectives_completed?: number | null
          priorities?: string
          reflection?: string | null
          total_objectives?: number | null
          updated_at?: string
          user_id: string
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          accomplishments?: string
          completion_percentage?: number | null
          created_at?: string
          help?: string
          hidden?: boolean
          id?: string
          likes?: number | null
          name?: string
          objectives_completed?: number | null
          priorities?: string
          reflection?: string | null
          total_objectives?: number | null
          updated_at?: string
          user_id?: string
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string | null
          ai_features_enabled: boolean
          avatar_url: string | null
          city: string | null
          country: string | null
          cover_photo_position: number | null
          cover_photo_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          email_contact: string | null
          full_name: string
          github_url: string | null
          google_id: string | null
          id: string
          instagram_url: string | null
          is_profile_complete: boolean
          last_active_at: string | null
          linkedin_url: string | null
          medium_url: string | null
          phone_number: string | null
          phone_verified: boolean
          signal_url: string | null
          snapchat_url: string | null
          social_links_order: string[] | null
          substack_url: string | null
          telegram_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          whatsapp_url: string | null
          youtube_url: string | null
        }
        Insert: {
          about_me?: string | null
          ai_features_enabled?: boolean
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          cover_photo_position?: number | null
          cover_photo_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          email_contact?: string | null
          full_name: string
          github_url?: string | null
          google_id?: string | null
          id: string
          instagram_url?: string | null
          is_profile_complete?: boolean
          last_active_at?: string | null
          linkedin_url?: string | null
          medium_url?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          signal_url?: string | null
          snapchat_url?: string | null
          social_links_order?: string[] | null
          substack_url?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_me?: string | null
          ai_features_enabled?: boolean
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          cover_photo_position?: number | null
          cover_photo_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          email_contact?: string | null
          full_name?: string
          github_url?: string | null
          google_id?: string | null
          id?: string
          instagram_url?: string | null
          is_profile_complete?: boolean
          last_active_at?: string | null
          linkedin_url?: string | null
          medium_url?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          signal_url?: string | null
          snapchat_url?: string | null
          social_links_order?: string[] | null
          substack_url?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      public_commitments: {
        Row: {
          created_at: string
          id: string
          objective_id: string
          rank: number
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective_id: string
          rank: number
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          objective_id?: string
          rank?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_commitments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: true
            referencedRelation: "weekly_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_reviews: {
        Row: {
          challenges: string | null
          completed_at: string | null
          created_at: string
          goals_review: Json | null
          id: string
          is_completed: boolean
          lessons_learned: string | null
          next_quarter_focus: string | null
          quarter: number
          quarter_start: string
          updated_at: string
          user_id: string
          wins: string | null
          year: number
        }
        Insert: {
          challenges?: string | null
          completed_at?: string | null
          created_at?: string
          goals_review?: Json | null
          id?: string
          is_completed?: boolean
          lessons_learned?: string | null
          next_quarter_focus?: string | null
          quarter: number
          quarter_start: string
          updated_at?: string
          user_id: string
          wins?: string | null
          year: number
        }
        Update: {
          challenges?: string | null
          completed_at?: string | null
          created_at?: string
          goals_review?: Json | null
          id?: string
          is_completed?: boolean
          lessons_learned?: string | null
          next_quarter_focus?: string | null
          quarter?: number
          quarter_start?: string
          updated_at?: string
          user_id?: string
          wins?: string | null
          year?: number
        }
        Relationships: []
      }
      strava_connections: {
        Row: {
          access_token: string
          athlete_firstname: string | null
          athlete_lastname: string | null
          auto_sync_enabled: boolean
          created_at: string | null
          expires_at: string
          id: string
          last_synced_at: string | null
          refresh_token: string
          scope: string | null
          strava_athlete_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          athlete_firstname?: string | null
          athlete_lastname?: string | null
          auto_sync_enabled?: boolean
          created_at?: string | null
          expires_at: string
          id?: string
          last_synced_at?: string | null
          refresh_token: string
          scope?: string | null
          strava_athlete_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          athlete_firstname?: string | null
          athlete_lastname?: string | null
          auto_sync_enabled?: boolean
          created_at?: string | null
          expires_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string
          scope?: string | null
          strava_athlete_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      synced_activities: {
        Row: {
          activity_name: string | null
          activity_type: string | null
          distance_meters: number | null
          duration_seconds: number | null
          habit_completion_created: boolean | null
          id: string
          matched_goal_id: string | null
          matched_habit_item_id: string | null
          start_date: string | null
          strava_activity_id: number
          synced_at: string | null
          user_id: string
        }
        Insert: {
          activity_name?: string | null
          activity_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          habit_completion_created?: boolean | null
          id?: string
          matched_goal_id?: string | null
          matched_habit_item_id?: string | null
          start_date?: string | null
          strava_activity_id: number
          synced_at?: string | null
          user_id: string
        }
        Update: {
          activity_name?: string | null
          activity_type?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          habit_completion_created?: boolean | null
          id?: string
          matched_goal_id?: string | null
          matched_habit_item_id?: string | null
          start_date?: string | null
          strava_activity_id?: number
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synced_activities_matched_goal_id_fkey"
            columns: ["matched_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      tos_acceptances: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          ip_address: string | null
          tos_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tos_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tos_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          click_count: number
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          keypress_count: number
          last_heartbeat_at: string
          scroll_count: number
          session_token: string
          started_at: string
          user_id: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          keypress_count?: number
          last_heartbeat_at?: string
          scroll_count?: number
          session_token: string
          started_at?: string
          user_id: string
        }
        Update: {
          click_count?: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          keypress_count?: number
          last_heartbeat_at?: string
          scroll_count?: number
          session_token?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_daily_streak: number
          current_quarterly_streak: number
          current_weekly_streak: number
          id: string
          last_check_in_date: string | null
          last_quarter_completed: string | null
          last_week_completed: string | null
          longest_daily_streak: number
          longest_quarterly_streak: number
          longest_weekly_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_daily_streak?: number
          current_quarterly_streak?: number
          current_weekly_streak?: number
          id?: string
          last_check_in_date?: string | null
          last_quarter_completed?: string | null
          last_week_completed?: string | null
          longest_daily_streak?: number
          longest_quarterly_streak?: number
          longest_weekly_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_daily_streak?: number
          current_quarterly_streak?: number
          current_weekly_streak?: number
          id?: string
          last_check_in_date?: string | null
          last_quarter_completed?: string | null
          last_week_completed?: string | null
          longest_daily_streak?: number
          longest_quarterly_streak?: number
          longest_weekly_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tours: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          dismissed_at: string | null
          id: string
          is_completed: boolean
          tour_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          dismissed_at?: string | null
          id?: string
          is_completed?: boolean
          tour_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          dismissed_at?: string | null
          id?: string
          is_completed?: boolean
          tour_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_objectives: {
        Row: {
          created_at: string
          goal_id: string | null
          id: string
          is_completed: boolean
          order_index: number | null
          scheduled_day: string | null
          scheduled_time: string | null
          text: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          goal_id?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number | null
          scheduled_day?: string | null
          scheduled_time?: string | null
          text: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          goal_id?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number | null
          scheduled_day?: string | null
          scheduled_time?: string | null
          text?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_objectives_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_planning_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          last_week_reflection: string | null
          updated_at: string
          user_id: string
          week_intention: string | null
          week_start: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          last_week_reflection?: string | null
          updated_at?: string
          user_id: string
          week_intention?: string | null
          week_start: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          last_week_reflection?: string | null
          updated_at?: string
          user_id?: string
          week_intention?: string | null
          week_start?: string
        }
        Relationships: []
      }
      weekly_progress_posts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          incomplete_reflections: Json | null
          is_completed: boolean
          notes: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          incomplete_reflections?: Json | null
          is_completed?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          incomplete_reflections?: Json | null
          is_completed?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _message: string
          _related_comment_id?: string
          _related_post_id?: string
          _related_request_id?: string
          _triggered_by_user_id?: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      delete_all_weekly_objectives: {
        Args: { _user_id: string; _week_start: string }
        Returns: number
      }
      delete_own_account: { Args: never; Returns: boolean }
      delete_user_gdpr: { Args: { target_user_id: string }; Returns: boolean }
      end_session: { Args: { _session_token: string }; Returns: boolean }
      get_accountability_data: { Args: never; Returns: Json }
      get_accountability_groups: {
        Args: never
        Returns: {
          group_description: string
          group_id: string
          group_name: string
          last_check_in_at: string
          member_count: number
          user_role: string
        }[]
      }
      get_accountability_partner: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          last_check_in_at: string
          partner_id: string
          partnership_id: string
          status: string
        }[]
      }
      get_accountability_partners: {
        Args: never
        Returns: {
          avatar_url: string
          can_view_partner_goals: boolean
          full_name: string
          last_check_in_at: string
          partner_can_view_my_goals: boolean
          partner_id: string
          partnership_id: string
          status: string
        }[]
      }
      get_admin_users_data: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          days_active: number
          email: string
          full_name: string
          id: string
          last_active_at: string
          posts_count: number
          role: string
          tos_accepted_at: string
          tos_version: string
          total_clicks: number
          total_keypresses: number
          total_scrolls: number
          total_time_seconds: number
        }[]
      }
      get_carryover_data: {
        Args: { p_current_week_start: string }
        Returns: Json
      }
      get_filtered_profile: { Args: { profile_id: string }; Returns: Json }
      get_goals_objective_counts: { Args: never; Returns: Json }
      get_habit_stats_data: { Args: never; Returns: Json }
      get_partner_dashboard_data: {
        Args: { p_partner_id: string; p_week_start: string }
        Returns: Json
      }
      get_profile_page_data: {
        Args: { p_profile_user_id: string }
        Returns: Json
      }
      get_profile_visibility_level: {
        Args: { profile_user_id: string; requesting_user_id: string }
        Returns: string
      }
      get_public_commitments: {
        Args: { _user_id: string; _week_start: string }
        Returns: {
          id: string
          is_completed: boolean
          objective_id: string
          objective_text: string
          rank: number
        }[]
      }
      get_user_friends: {
        Args: { _user_id?: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          friend_count: number
          friend_id: string
          full_name: string
          last_active_at: string
          mutual_friends_count: number
        }[]
      }
      get_weekly_dashboard_data: {
        Args: { p_last_week_start: string; p_week_start: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: { _user_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { _notification_id: string; _user_id: string }
        Returns: boolean
      }
      normalize_to_monday: { Args: { d: string }; Returns: string }
      record_accountability_check_in: {
        Args: {
          p_message?: string
          p_partnership_id: string
          p_reply_to_id?: string
        }
        Returns: Json
      }
      remove_friend: { Args: { _friend_id: string }; Returns: boolean }
      reorder_goals: { Args: { p_goal_orders: Json }; Returns: undefined }
      respond_to_accountability_partner_request: {
        Args: {
          _override_receiver_can_view_sender_goals?: boolean
          _override_sender_can_view_receiver_goals?: boolean
          _request_id: string
          _response: string
        }
        Returns: boolean
      }
      respond_to_friend_request: {
        Args: { _request_id: string; _response: string }
        Returns: boolean
      }
      send_accountability_partner_request: {
        Args: {
          _message?: string
          _receiver_can_view_sender_goals?: boolean
          _receiver_id: string
          _sender_can_view_receiver_goals?: boolean
        }
        Returns: string
      }
      send_friend_request: { Args: { _receiver_id: string }; Returns: string }
      set_public_commitments: {
        Args: { _objective_ids: string[]; _week_start: string }
        Returns: boolean
      }
      toggle_comment_like: {
        Args: { _comment_id: string; _user_id: string }
        Returns: boolean
      }
      toggle_post_like: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
      update_user_last_active: { Args: never; Returns: undefined }
      upsert_session_heartbeat: {
        Args: {
          _clicks?: number
          _keypresses?: number
          _scrolls?: number
          _session_token: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
