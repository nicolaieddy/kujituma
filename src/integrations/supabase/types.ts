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
    PostgrestVersion: "14.5"
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
            foreignKeyName: "accountability_check_ins_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "accountability_partner_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partner_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partner_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "accountability_partnerships_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partnerships_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partnerships_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_laps: {
        Row: {
          activity_id: string
          avg_cadence: number | null
          avg_gap: number | null
          avg_gct_balance: number | null
          avg_ground_contact_time: number | null
          avg_heart_rate: number | null
          avg_moving_pace: number | null
          avg_power: number | null
          avg_run_cadence: number | null
          avg_speed: number | null
          avg_step_speed_loss: number | null
          avg_step_speed_loss_percent: number | null
          avg_stride_length: number | null
          avg_temperature: number | null
          avg_vertical_oscillation: number | null
          avg_vertical_ratio: number | null
          avg_watts_per_kg: number | null
          best_pace: number | null
          calories: number | null
          created_at: string
          cumulative_time_seconds: number | null
          distance_meters: number | null
          duration_seconds: number | null
          end_lat: number | null
          end_lng: number | null
          id: string
          lap_index: number
          max_altitude: number | null
          max_heart_rate: number | null
          max_power: number | null
          max_run_cadence: number | null
          max_speed: number | null
          max_watts_per_kg: number | null
          min_altitude: number | null
          moving_time_seconds: number | null
          normalized_power: number | null
          start_lat: number | null
          start_lng: number | null
          start_time: string | null
          total_ascent: number | null
          total_descent: number | null
          total_elapsed_time: number | null
          total_elevation_gain: number | null
          total_strides: number | null
          total_timer_time: number | null
          user_id: string
        }
        Insert: {
          activity_id: string
          avg_cadence?: number | null
          avg_gap?: number | null
          avg_gct_balance?: number | null
          avg_ground_contact_time?: number | null
          avg_heart_rate?: number | null
          avg_moving_pace?: number | null
          avg_power?: number | null
          avg_run_cadence?: number | null
          avg_speed?: number | null
          avg_step_speed_loss?: number | null
          avg_step_speed_loss_percent?: number | null
          avg_stride_length?: number | null
          avg_temperature?: number | null
          avg_vertical_oscillation?: number | null
          avg_vertical_ratio?: number | null
          avg_watts_per_kg?: number | null
          best_pace?: number | null
          calories?: number | null
          created_at?: string
          cumulative_time_seconds?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          lap_index: number
          max_altitude?: number | null
          max_heart_rate?: number | null
          max_power?: number | null
          max_run_cadence?: number | null
          max_speed?: number | null
          max_watts_per_kg?: number | null
          min_altitude?: number | null
          moving_time_seconds?: number | null
          normalized_power?: number | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string | null
          total_ascent?: number | null
          total_descent?: number | null
          total_elapsed_time?: number | null
          total_elevation_gain?: number | null
          total_strides?: number | null
          total_timer_time?: number | null
          user_id: string
        }
        Update: {
          activity_id?: string
          avg_cadence?: number | null
          avg_gap?: number | null
          avg_gct_balance?: number | null
          avg_ground_contact_time?: number | null
          avg_heart_rate?: number | null
          avg_moving_pace?: number | null
          avg_power?: number | null
          avg_run_cadence?: number | null
          avg_speed?: number | null
          avg_step_speed_loss?: number | null
          avg_step_speed_loss_percent?: number | null
          avg_stride_length?: number | null
          avg_temperature?: number | null
          avg_vertical_oscillation?: number | null
          avg_vertical_ratio?: number | null
          avg_watts_per_kg?: number | null
          best_pace?: number | null
          calories?: number | null
          created_at?: string
          cumulative_time_seconds?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          lap_index?: number
          max_altitude?: number | null
          max_heart_rate?: number | null
          max_power?: number | null
          max_run_cadence?: number | null
          max_speed?: number | null
          max_watts_per_kg?: number | null
          min_altitude?: number | null
          moving_time_seconds?: number | null
          normalized_power?: number | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string | null
          total_ascent?: number | null
          total_descent?: number | null
          total_elapsed_time?: number | null
          total_elevation_gain?: number | null
          total_strides?: number | null
          total_timer_time?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_laps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "synced_activities"
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "activity_mappings_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_streams: {
        Row: {
          activity_id: string
          altitude: number | null
          cadence: number | null
          created_at: string
          heart_rate: number | null
          id: string
          latitude: number | null
          longitude: number | null
          power: number | null
          speed: number | null
          timestamp_offset_seconds: number
          user_id: string
        }
        Insert: {
          activity_id: string
          altitude?: number | null
          cadence?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          power?: number | null
          speed?: number | null
          timestamp_offset_seconds: number
          user_id: string
        }
        Update: {
          activity_id?: string
          altitude?: number | null
          cadence?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          power?: number | null
          speed?: number | null
          timestamp_offset_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_streams_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "synced_activities"
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
      body_measurements: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          id: string
          lean_mass_kg: number | null
          measured_on: string
          notes: string | null
          resting_hr: number | null
          source: string
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          lean_mass_kg?: number | null
          measured_on: string
          notes?: string | null
          resting_hr?: number | null
          source?: string
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          lean_mass_kg?: number | null
          measured_on?: string
          notes?: string | null
          resting_hr?: number | null
          source?: string
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
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
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
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
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
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
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
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
      garmin_body_composition: {
        Row: {
          bmi: number | null
          body_fat_pct: number | null
          body_water_pct: number | null
          bone_mass_kg: number | null
          created_at: string
          id: string
          measured_at: string | null
          measured_on: string
          metabolic_age: number | null
          muscle_mass_kg: number | null
          physique_rating: string | null
          raw_row: Json | null
          source_device: string | null
          synced_at: string
          updated_at: string
          user_id: string
          visceral_fat: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          body_fat_pct?: number | null
          body_water_pct?: number | null
          bone_mass_kg?: number | null
          created_at?: string
          id?: string
          measured_at?: string | null
          measured_on: string
          metabolic_age?: number | null
          muscle_mass_kg?: number | null
          physique_rating?: string | null
          raw_row?: Json | null
          source_device?: string | null
          synced_at?: string
          updated_at?: string
          user_id: string
          visceral_fat?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          body_fat_pct?: number | null
          body_water_pct?: number | null
          bone_mass_kg?: number | null
          created_at?: string
          id?: string
          measured_at?: string | null
          measured_on?: string
          metabolic_age?: number | null
          muscle_mass_kg?: number | null
          physique_rating?: string | null
          raw_row?: Json | null
          source_device?: string | null
          synced_at?: string
          updated_at?: string
          user_id?: string
          visceral_fat?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      garmin_connections: {
        Row: {
          backfill_completed: boolean
          connected_at: string
          created_at: string
          encrypted_email: string
          encrypted_password: string
          garmin_user_id: string | null
          id: string
          last_activity_anchor: string | null
          last_error: string | null
          last_login_at: string | null
          last_sync_at: string | null
          session_tokens: Json | null
          sync_anchor: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backfill_completed?: boolean
          connected_at?: string
          created_at?: string
          encrypted_email: string
          encrypted_password: string
          garmin_user_id?: string | null
          id?: string
          last_activity_anchor?: string | null
          last_error?: string | null
          last_login_at?: string | null
          last_sync_at?: string | null
          session_tokens?: Json | null
          sync_anchor?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backfill_completed?: boolean
          connected_at?: string
          created_at?: string
          encrypted_email?: string
          encrypted_password?: string
          garmin_user_id?: string | null
          id?: string
          last_activity_anchor?: string | null
          last_error?: string | null
          last_login_at?: string | null
          last_sync_at?: string | null
          session_tokens?: Json | null
          sync_anchor?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      garmin_wellness_daily: {
        Row: {
          active_calories: number | null
          body_battery_charged: number | null
          body_battery_drained: number | null
          body_battery_max: number | null
          body_battery_min: number | null
          created_at: string
          floors_climbed: number | null
          hrv_last_night_avg: number | null
          hrv_status: string | null
          hrv_weekly_avg: number | null
          id: string
          max_heart_rate: number | null
          min_heart_rate: number | null
          raw_row: Json | null
          respiration_avg: number | null
          resting_heart_rate: number | null
          source: string
          spo2_avg: number | null
          steps: number | null
          stress_avg: number | null
          stress_max: number | null
          synced_at: string
          total_calories: number | null
          updated_at: string
          user_id: string
          wellness_date: string
        }
        Insert: {
          active_calories?: number | null
          body_battery_charged?: number | null
          body_battery_drained?: number | null
          body_battery_max?: number | null
          body_battery_min?: number | null
          created_at?: string
          floors_climbed?: number | null
          hrv_last_night_avg?: number | null
          hrv_status?: string | null
          hrv_weekly_avg?: number | null
          id?: string
          max_heart_rate?: number | null
          min_heart_rate?: number | null
          raw_row?: Json | null
          respiration_avg?: number | null
          resting_heart_rate?: number | null
          source?: string
          spo2_avg?: number | null
          steps?: number | null
          stress_avg?: number | null
          stress_max?: number | null
          synced_at?: string
          total_calories?: number | null
          updated_at?: string
          user_id: string
          wellness_date: string
        }
        Update: {
          active_calories?: number | null
          body_battery_charged?: number | null
          body_battery_drained?: number | null
          body_battery_max?: number | null
          body_battery_min?: number | null
          created_at?: string
          floors_climbed?: number | null
          hrv_last_night_avg?: number | null
          hrv_status?: string | null
          hrv_weekly_avg?: number | null
          id?: string
          max_heart_rate?: number | null
          min_heart_rate?: number | null
          raw_row?: Json | null
          respiration_avg?: number | null
          resting_heart_rate?: number | null
          source?: string
          spo2_avg?: number | null
          steps?: number | null
          stress_avg?: number | null
          stress_max?: number | null
          synced_at?: string
          total_calories?: number | null
          updated_at?: string
          user_id?: string
          wellness_date?: string
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
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
          {
            foreignKeyName: "goal_status_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_updates_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_value_links: {
        Row: {
          ai_confidence: number | null
          ai_reason: string | null
          created_at: string
          goal_id: string
          id: string
          source: Database["public"]["Enums"]["goal_value_link_source"]
          updated_at: string
          user_id: string
          value_id: string
          weight: number
        }
        Insert: {
          ai_confidence?: number | null
          ai_reason?: string | null
          created_at?: string
          goal_id: string
          id?: string
          source?: Database["public"]["Enums"]["goal_value_link_source"]
          updated_at?: string
          user_id: string
          value_id: string
          weight?: number
        }
        Update: {
          ai_confidence?: number | null
          ai_reason?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          source?: Database["public"]["Enums"]["goal_value_link_source"]
          updated_at?: string
          user_id?: string
          value_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_value_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_value_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_value_links_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "user_values"
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
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "habit_completions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          action: string
          id?: string
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          action?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_result_values: {
        Row: {
          created_at: string
          flag: string | null
          id: string
          lab_result_id: string
          marker_key: string
          marker_label: string
          reference_high: number | null
          reference_low: number | null
          unit: string | null
          updated_at: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          flag?: string | null
          id?: string
          lab_result_id: string
          marker_key: string
          marker_label: string
          reference_high?: number | null
          reference_low?: number | null
          unit?: string | null
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          flag?: string | null
          id?: string
          lab_result_id?: string
          marker_key?: string
          marker_label?: string
          reference_high?: number | null
          reference_low?: number | null
          unit?: string | null
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_values_lab_result_id_fkey"
            columns: ["lab_result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string
          id: string
          lab_provider: string | null
          notes: string | null
          panel_name: string
          taken_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lab_provider?: string | null
          notes?: string | null
          panel_name: string
          taken_on: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lab_provider?: string | null
          notes?: string | null
          panel_name?: string
          taken_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_api_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_revoked: boolean
          last_used_at: string | null
          name: string
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          last_used_at?: string | null
          name?: string
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          last_used_at?: string | null
          name?: string
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_api_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_api_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      media_candidates: {
        Row: {
          approved_mention_id: string | null
          archived_url: string | null
          confidence: number | null
          created_at: string
          date: string | null
          featured: boolean
          id: string
          outlet: string | null
          raw_snippet: string | null
          review_status: Database["public"]["Enums"]["media_review_status"]
          sentiment: Database["public"]["Enums"]["media_sentiment"] | null
          source: Database["public"]["Enums"]["media_source"]
          status: Database["public"]["Enums"]["media_status"] | null
          summary: string | null
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["media_type"] | null
          updated_at: string
          url: string | null
          url_status: Database["public"]["Enums"]["media_url_status"] | null
          user_id: string
        }
        Insert: {
          approved_mention_id?: string | null
          archived_url?: string | null
          confidence?: number | null
          created_at?: string
          date?: string | null
          featured?: boolean
          id?: string
          outlet?: string | null
          raw_snippet?: string | null
          review_status?: Database["public"]["Enums"]["media_review_status"]
          sentiment?: Database["public"]["Enums"]["media_sentiment"] | null
          source?: Database["public"]["Enums"]["media_source"]
          status?: Database["public"]["Enums"]["media_status"] | null
          summary?: string | null
          tags?: string[]
          title: string
          type?: Database["public"]["Enums"]["media_type"] | null
          updated_at?: string
          url?: string | null
          url_status?: Database["public"]["Enums"]["media_url_status"] | null
          user_id: string
        }
        Update: {
          approved_mention_id?: string | null
          archived_url?: string | null
          confidence?: number | null
          created_at?: string
          date?: string | null
          featured?: boolean
          id?: string
          outlet?: string | null
          raw_snippet?: string | null
          review_status?: Database["public"]["Enums"]["media_review_status"]
          sentiment?: Database["public"]["Enums"]["media_sentiment"] | null
          source?: Database["public"]["Enums"]["media_source"]
          status?: Database["public"]["Enums"]["media_status"] | null
          summary?: string | null
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["media_type"] | null
          updated_at?: string
          url?: string | null
          url_status?: Database["public"]["Enums"]["media_url_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_candidates_approved_mention_id_fkey"
            columns: ["approved_mention_id"]
            isOneToOne: false
            referencedRelation: "media_mentions"
            referencedColumns: ["id"]
          },
        ]
      }
      media_mentions: {
        Row: {
          archived_url: string | null
          created_at: string
          date: string
          featured: boolean
          id: string
          is_public: boolean
          outlet: string
          sentiment: Database["public"]["Enums"]["media_sentiment"] | null
          source: Database["public"]["Enums"]["media_source"]
          status: Database["public"]["Enums"]["media_status"]
          story_id: string | null
          summary: string | null
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at: string
          url: string | null
          url_status: Database["public"]["Enums"]["media_url_status"]
          user_id: string
          year: number | null
        }
        Insert: {
          archived_url?: string | null
          created_at?: string
          date: string
          featured?: boolean
          id?: string
          is_public?: boolean
          outlet?: string
          sentiment?: Database["public"]["Enums"]["media_sentiment"] | null
          source?: Database["public"]["Enums"]["media_source"]
          status?: Database["public"]["Enums"]["media_status"]
          story_id?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          url?: string | null
          url_status?: Database["public"]["Enums"]["media_url_status"]
          user_id: string
          year?: number | null
        }
        Update: {
          archived_url?: string | null
          created_at?: string
          date?: string
          featured?: boolean
          id?: string
          is_public?: boolean
          outlet?: string
          sentiment?: Database["public"]["Enums"]["media_sentiment"] | null
          source?: Database["public"]["Enums"]["media_source"]
          status?: Database["public"]["Enums"]["media_status"]
          story_id?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          url?: string | null
          url_status?: Database["public"]["Enums"]["media_url_status"]
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_mentions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "media_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      media_stories: {
        Row: {
          announcement_date: string
          cover_url: string | null
          created_at: string
          featured: boolean
          id: string
          is_public: boolean
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_date?: string
          cover_url?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          is_public?: boolean
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_date?: string
          cover_url?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          is_public?: boolean
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_distance_aggregates: {
        Row: {
          created_at: string
          distance_km: number
          id: string
          month: string
          source: string
          sport: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_km?: number
          id?: string
          month: string
          source?: string
          sport?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          id?: string
          month?: string
          source?: string
          sport?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_contact_events: {
        Row: {
          contact_id: string
          created_at: string
          event_date: string
          id: string
          is_recurring: boolean
          title: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          event_date: string
          id?: string
          is_recurring?: boolean
          title: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          event_date?: string
          id?: string
          is_recurring?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_contact_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      network_contact_key_facts: {
        Row: {
          contact_id: string
          created_at: string
          fact: string
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          fact: string
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          fact?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_contact_key_facts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      network_contact_resources: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          label: string
          type: string
          url: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          label: string
          type: string
          url: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          label?: string
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_contact_resources_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      network_contacts: {
        Row: {
          birthday: string | null
          country: string | null
          created_at: string
          email: string | null
          first_met_month: number | null
          first_met_year: number | null
          full_name: string
          id: string
          influence_score: number | null
          influence_type: string
          instagram_url: string | null
          is_inner_circle: boolean
          labels: string[]
          last_interaction_date: string | null
          latitude: number | null
          linkedin_url: string | null
          living_location: string | null
          longitude: number | null
          muted_from_brief: boolean
          notes: string | null
          photo_url: string | null
          region: string | null
          relationship_strength: string | null
          sector: string | null
          strategic_importance: number | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          birthday?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_met_month?: number | null
          first_met_year?: number | null
          full_name: string
          id?: string
          influence_score?: number | null
          influence_type?: string
          instagram_url?: string | null
          is_inner_circle?: boolean
          labels?: string[]
          last_interaction_date?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          living_location?: string | null
          longitude?: number | null
          muted_from_brief?: boolean
          notes?: string | null
          photo_url?: string | null
          region?: string | null
          relationship_strength?: string | null
          sector?: string | null
          strategic_importance?: number | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          birthday?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_met_month?: number | null
          first_met_year?: number | null
          full_name?: string
          id?: string
          influence_score?: number | null
          influence_type?: string
          instagram_url?: string | null
          is_inner_circle?: boolean
          labels?: string[]
          last_interaction_date?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          living_location?: string | null
          longitude?: number | null
          muted_from_brief?: boolean
          notes?: string | null
          photo_url?: string | null
          region?: string | null
          relationship_strength?: string | null
          sector?: string | null
          strategic_importance?: number | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      network_interactions: {
        Row: {
          contact_id: string
          created_at: string
          date: string
          direction: string | null
          follow_up_date: string | null
          id: string
          summary: string | null
          type: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          date?: string
          direction?: string | null
          follow_up_date?: string | null
          id?: string
          summary?: string | null
          type: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          date?: string
          direction?: string | null
          follow_up_date?: string | null
          id?: string
          summary?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      network_message_templates: {
        Row: {
          created_at: string
          event_type: string
          id: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "objective_comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          {
            foreignKeyName: "objective_comment_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          {
            foreignKeyName: "objective_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          {
            foreignKeyName: "objective_partner_feedback_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_check_in_reads: {
        Row: {
          last_seen_at: string
          partnership_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          partnership_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          partnership_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_check_in_reads_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
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
            foreignKeyName: "partnership_visibility_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          timezone: string | null
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
          timezone?: string | null
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
          timezone?: string | null
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
          {
            foreignKeyName: "public_commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
      sleep_entries: {
        Row: {
          bedtime: string | null
          body_battery: number | null
          created_at: string
          duration_seconds: number | null
          garmin_summary_id: string | null
          hrv_status: string | null
          id: string
          pulse_ox: number | null
          quality: string | null
          raw_row: Json | null
          respiration: number | null
          resting_heart_rate: number | null
          score: number | null
          skin_temp_change: number | null
          sleep_alignment: string | null
          sleep_date: string
          sleep_need_seconds: number | null
          source: string
          updated_at: string
          user_id: string
          wake_time: string | null
        }
        Insert: {
          bedtime?: string | null
          body_battery?: number | null
          created_at?: string
          duration_seconds?: number | null
          garmin_summary_id?: string | null
          hrv_status?: string | null
          id?: string
          pulse_ox?: number | null
          quality?: string | null
          raw_row?: Json | null
          respiration?: number | null
          resting_heart_rate?: number | null
          score?: number | null
          skin_temp_change?: number | null
          sleep_alignment?: string | null
          sleep_date: string
          sleep_need_seconds?: number | null
          source?: string
          updated_at?: string
          user_id: string
          wake_time?: string | null
        }
        Update: {
          bedtime?: string | null
          body_battery?: number | null
          created_at?: string
          duration_seconds?: number | null
          garmin_summary_id?: string | null
          hrv_status?: string | null
          id?: string
          pulse_ox?: number | null
          quality?: string | null
          raw_row?: Json | null
          respiration?: number | null
          resting_heart_rate?: number | null
          score?: number | null
          skin_temp_change?: number | null
          sleep_alignment?: string | null
          sleep_date?: string
          sleep_need_seconds?: number | null
          source?: string
          updated_at?: string
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      social_daily_account_metrics: {
        Row: {
          created_at: string
          date: string
          engagements: number | null
          id: string
          impressions: number | null
          members_reached: number | null
          new_followers: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          engagements?: number | null
          id?: string
          impressions?: number | null
          members_reached?: number | null
          new_followers?: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          engagements?: number | null
          id?: string
          impressions?: number | null
          members_reached?: number | null
          new_followers?: number | null
          platform?: Database["public"]["Enums"]["social_platform"]
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_follower_growth: {
        Row: {
          created_at: string
          date: string
          id: string
          net_new: number | null
          note: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          total_followers: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          net_new?: number | null
          note?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          total_followers: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          net_new?: number | null
          note?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          total_followers?: number
          user_id?: string
        }
        Relationships: []
      }
      social_goals: {
        Row: {
          created_at: string
          id: string
          linked_goal_id: string | null
          metric: string
          notes: string | null
          platform: string
          start_date: string
          start_value: number
          status: string
          target_date: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_goal_id?: string | null
          metric: string
          notes?: string | null
          platform: string
          start_date: string
          start_value: number
          status?: string
          target_date: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_goal_id?: string | null
          metric?: string
          notes?: string | null
          platform?: string
          start_date?: string
          start_value?: number
          status?: string
          target_date?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_goals_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "social_goals_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      social_import_history: {
        Row: {
          action: string
          created_at: string
          file_name: string | null
          id: string
          kind: string
          platform: string
          post_id: string | null
          post_url: string | null
          summary: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          file_name?: string | null
          id?: string
          kind: string
          platform: string
          post_id?: string | null
          post_url?: string | null
          summary?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          file_name?: string | null
          id?: string
          kind?: string
          platform?: string
          post_id?: string | null
          post_url?: string | null
          summary?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_import_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_platform_settings: {
        Row: {
          created_at: string
          current_followers_cached: number | null
          enabled: boolean
          follower_target: number | null
          id: string
          notes: string | null
          pillars: string[]
          platform: Database["public"]["Enums"]["social_platform"]
          target_deadline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_followers_cached?: number | null
          enabled?: boolean
          follower_target?: number | null
          id?: string
          notes?: string | null
          pillars?: string[]
          platform: Database["public"]["Enums"]["social_platform"]
          target_deadline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_followers_cached?: number | null
          enabled?: boolean
          follower_target?: number | null
          id?: string
          notes?: string | null
          pillars?: string[]
          platform?: Database["public"]["Enums"]["social_platform"]
          target_deadline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_post_metrics: {
        Row: {
          comments: number | null
          created_at: string
          engagement_rate: number | null
          followers_gained: number | null
          id: string
          impressions: number | null
          link_clicks: number | null
          metrics_as_of: string
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          profile_views: number | null
          reach: number | null
          reactions: number | null
          reposts: number | null
          saves: number | null
          sends: number | null
          user_id: string
        }
        Insert: {
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          followers_gained?: number | null
          id?: string
          impressions?: number | null
          link_clicks?: number | null
          metrics_as_of: string
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          profile_views?: number | null
          reach?: number | null
          reactions?: number | null
          reposts?: number | null
          saves?: number | null
          sends?: number | null
          user_id: string
        }
        Update: {
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          followers_gained?: number | null
          id?: string
          impressions?: number | null
          link_clicks?: number | null
          metrics_as_of?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id?: string
          profile_views?: number | null
          reach?: number | null
          reactions?: number | null
          reposts?: number | null
          saves?: number | null
          sends?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_values: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          value_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          value_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          value_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_post_values_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_values_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "user_values"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          body: string | null
          created_at: string
          goal_id: string | null
          hold: boolean
          id: string
          live_url: string | null
          media: string[]
          pillars: string[]
          platforms: Database["public"]["Enums"]["social_platform"][]
          publish_at: string | null
          publish_date: string | null
          retro: string | null
          review_notes: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["social_status"]
          title: string
          trust_check: Database["public"]["Enums"]["social_trust_check"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          goal_id?: string | null
          hold?: boolean
          id?: string
          live_url?: string | null
          media?: string[]
          pillars?: string[]
          platforms?: Database["public"]["Enums"]["social_platform"][]
          publish_at?: string | null
          publish_date?: string | null
          retro?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          title?: string
          trust_check?: Database["public"]["Enums"]["social_trust_check"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          goal_id?: string | null
          hold?: boolean
          id?: string
          live_url?: string | null
          media?: string[]
          pillars?: string[]
          platforms?: Database["public"]["Enums"]["social_platform"][]
          publish_at?: string | null
          publish_date?: string | null
          retro?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["social_status"]
          title?: string
          trust_check?: Database["public"]["Enums"]["social_trust_check"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "social_posts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
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
      supplement_logs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          supplement_id: string
          taken: boolean
          taken_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          supplement_id: string
          taken?: boolean
          taken_on: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          supplement_id?: string
          taken?: boolean
          taken_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_logs_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplements"
            referencedColumns: ["id"]
          },
        ]
      }
      supplements: {
        Row: {
          archived_at: string | null
          created_at: string
          dose: number | null
          dose_unit: string | null
          id: string
          name: string
          notes: string | null
          schedule: string
          schedule_config: Json
          started_on: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          dose?: number | null
          dose_unit?: string | null
          id?: string
          name: string
          notes?: string | null
          schedule?: string
          schedule_config?: Json
          started_on?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          dose?: number | null
          dose_unit?: string | null
          id?: string
          name?: string
          notes?: string | null
          schedule?: string
          schedule_config?: Json
          started_on?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_run_logs: {
        Row: {
          counters: Json
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          items: Json
          provider: string
          started_at: string
          status: string
          trigger: string
          user_id: string
        }
        Insert: {
          counters?: Json
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          items?: Json
          provider: string
          started_at?: string
          status: string
          trigger?: string
          user_id: string
        }
        Update: {
          counters?: Json
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          items?: Json
          provider?: string
          started_at?: string
          status?: string
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_activities: {
        Row: {
          activity_date: string | null
          activity_name: string | null
          activity_type: string | null
          average_cadence: number | null
          average_heartrate: number | null
          average_power: number | null
          average_speed: number | null
          avg_stance_time: number | null
          avg_step_length: number | null
          avg_temperature: number | null
          avg_vertical_oscillation: number | null
          avg_vertical_ratio: number | null
          bbox_east: number | null
          bbox_north: number | null
          bbox_south: number | null
          bbox_west: number | null
          calories: number | null
          device_manufacturer: string | null
          device_product: string | null
          distance_meters: number | null
          duration_seconds: number | null
          elapsed_time_seconds: number | null
          fit_file_path: string | null
          ftp: number | null
          garmin_activity_id: string | null
          garmin_summary_id: string | null
          habit_completion_created: boolean | null
          id: string
          matched_goal_id: string | null
          matched_habit_item_id: string | null
          max_cadence: number | null
          max_heartrate: number | null
          max_power: number | null
          max_speed: number | null
          normalized_power: number | null
          num_laps: number | null
          records_json: Json | null
          reflection: string | null
          reflection_updated_at: string | null
          source: string
          sport_type: string | null
          start_date: string | null
          strava_activity_id: number | null
          strava_description: string | null
          sub_sport: string | null
          suffer_score: number | null
          synced_at: string | null
          timezone: string | null
          total_ascent: number | null
          total_descent: number | null
          total_elevation_gain: number | null
          total_strides: number | null
          training_effect: number | null
          tss: number | null
          user_id: string
          workout_type_id: number | null
        }
        Insert: {
          activity_date?: string | null
          activity_name?: string | null
          activity_type?: string | null
          average_cadence?: number | null
          average_heartrate?: number | null
          average_power?: number | null
          average_speed?: number | null
          avg_stance_time?: number | null
          avg_step_length?: number | null
          avg_temperature?: number | null
          avg_vertical_oscillation?: number | null
          avg_vertical_ratio?: number | null
          bbox_east?: number | null
          bbox_north?: number | null
          bbox_south?: number | null
          bbox_west?: number | null
          calories?: number | null
          device_manufacturer?: string | null
          device_product?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          elapsed_time_seconds?: number | null
          fit_file_path?: string | null
          ftp?: number | null
          garmin_activity_id?: string | null
          garmin_summary_id?: string | null
          habit_completion_created?: boolean | null
          id?: string
          matched_goal_id?: string | null
          matched_habit_item_id?: string | null
          max_cadence?: number | null
          max_heartrate?: number | null
          max_power?: number | null
          max_speed?: number | null
          normalized_power?: number | null
          num_laps?: number | null
          records_json?: Json | null
          reflection?: string | null
          reflection_updated_at?: string | null
          source?: string
          sport_type?: string | null
          start_date?: string | null
          strava_activity_id?: number | null
          strava_description?: string | null
          sub_sport?: string | null
          suffer_score?: number | null
          synced_at?: string | null
          timezone?: string | null
          total_ascent?: number | null
          total_descent?: number | null
          total_elevation_gain?: number | null
          total_strides?: number | null
          training_effect?: number | null
          tss?: number | null
          user_id: string
          workout_type_id?: number | null
        }
        Update: {
          activity_date?: string | null
          activity_name?: string | null
          activity_type?: string | null
          average_cadence?: number | null
          average_heartrate?: number | null
          average_power?: number | null
          average_speed?: number | null
          avg_stance_time?: number | null
          avg_step_length?: number | null
          avg_temperature?: number | null
          avg_vertical_oscillation?: number | null
          avg_vertical_ratio?: number | null
          bbox_east?: number | null
          bbox_north?: number | null
          bbox_south?: number | null
          bbox_west?: number | null
          calories?: number | null
          device_manufacturer?: string | null
          device_product?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          elapsed_time_seconds?: number | null
          fit_file_path?: string | null
          ftp?: number | null
          garmin_activity_id?: string | null
          garmin_summary_id?: string | null
          habit_completion_created?: boolean | null
          id?: string
          matched_goal_id?: string | null
          matched_habit_item_id?: string | null
          max_cadence?: number | null
          max_heartrate?: number | null
          max_power?: number | null
          max_speed?: number | null
          normalized_power?: number | null
          num_laps?: number | null
          records_json?: Json | null
          reflection?: string | null
          reflection_updated_at?: string | null
          source?: string
          sport_type?: string | null
          start_date?: string | null
          strava_activity_id?: number | null
          strava_description?: string | null
          sub_sport?: string | null
          suffer_score?: number | null
          synced_at?: string | null
          timezone?: string | null
          total_ascent?: number | null
          total_descent?: number | null
          total_elevation_gain?: number | null
          total_strides?: number | null
          training_effect?: number | null
          tss?: number | null
          user_id?: string
          workout_type_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "synced_activities_matched_goal_id_fkey"
            columns: ["matched_goal_id"]
            isOneToOne: false
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
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
      training_event_attachments: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          extracted_at: string | null
          extraction_error: string | null
          extraction_status: string
          file_name: string
          file_path: string | null
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          synced_activity_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          extracted_at?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_name: string
          file_path?: string | null
          id?: string
          kind: string
          mime_type?: string | null
          size_bytes?: number | null
          synced_activity_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          extracted_at?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_name?: string
          file_path?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          synced_activity_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_event_attachments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "training_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_event_attachments_synced_activity_id_fkey"
            columns: ["synced_activity_id"]
            isOneToOne: false
            referencedRelation: "synced_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      training_events: {
        Row: {
          body_part: string | null
          body_parts: Json
          created_at: string
          description: string | null
          end_date: string | null
          event_type: Database["public"]["Enums"]["training_event_type"]
          id: string
          issue_category: string | null
          linked_activity_id: string | null
          location: string | null
          metadata: Json
          official_time_seconds: number | null
          race_distance: string | null
          race_priority: string | null
          race_result: string | null
          severity: number | null
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_part?: string | null
          body_parts?: Json
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type: Database["public"]["Enums"]["training_event_type"]
          id?: string
          issue_category?: string | null
          linked_activity_id?: string | null
          location?: string | null
          metadata?: Json
          official_time_seconds?: number | null
          race_distance?: string | null
          race_priority?: string | null
          race_result?: string | null
          severity?: number | null
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_part?: string | null
          body_parts?: Json
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["training_event_type"]
          id?: string
          issue_category?: string | null
          linked_activity_id?: string | null
          location?: string | null
          metadata?: Json
          official_time_seconds?: number | null
          race_distance?: string | null
          race_priority?: string | null
          race_result?: string | null
          severity?: number | null
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_events_linked_activity_id_fkey"
            columns: ["linked_activity_id"]
            isOneToOne: false
            referencedRelation: "synced_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_imports: {
        Row: {
          created_at: string
          field_mapping_report: Json
          id: string
          parsed_summary: Json
          source_file_name: string | null
          source_file_path: string | null
          source_mime: string | null
          source_text: string | null
          source_type: string
          updated_at: string
          user_id: string
          week_start: string
          workout_count: number
        }
        Insert: {
          created_at?: string
          field_mapping_report?: Json
          id?: string
          parsed_summary?: Json
          source_file_name?: string | null
          source_file_path?: string | null
          source_mime?: string | null
          source_text?: string | null
          source_type: string
          updated_at?: string
          user_id: string
          week_start: string
          workout_count?: number
        }
        Update: {
          created_at?: string
          field_mapping_report?: Json
          id?: string
          parsed_summary?: Json
          source_file_name?: string | null
          source_file_path?: string | null
          source_mime?: string | null
          source_text?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          workout_count?: number
        }
        Relationships: []
      }
      training_plan_workouts: {
        Row: {
          created_at: string
          day_of_week: number
          description: string | null
          goal_id: string | null
          id: string
          matched_activity_id: string | null
          matched_strava_activity_id: number | null
          notes: string | null
          order_index: number
          source_import_id: string | null
          target_distance_meters: number | null
          target_duration_seconds: number | null
          target_pace_per_km: number | null
          title: string
          updated_at: string
          user_id: string
          week_start: string
          workout_type: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          description?: string | null
          goal_id?: string | null
          id?: string
          matched_activity_id?: string | null
          matched_strava_activity_id?: number | null
          notes?: string | null
          order_index?: number
          source_import_id?: string | null
          target_distance_meters?: number | null
          target_duration_seconds?: number | null
          target_pace_per_km?: number | null
          title?: string
          updated_at?: string
          user_id: string
          week_start: string
          workout_type?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          description?: string | null
          goal_id?: string | null
          id?: string
          matched_activity_id?: string | null
          matched_strava_activity_id?: number | null
          notes?: string | null
          order_index?: number
          source_import_id?: string | null
          target_distance_meters?: number | null
          target_duration_seconds?: number | null
          target_pace_per_km?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_workouts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "training_plan_workouts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_workouts_matched_activity_id_fkey"
            columns: ["matched_activity_id"]
            isOneToOne: false
            referencedRelation: "synced_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_workouts_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "training_plan_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      training_workout_activities: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          session_order: number
          workout_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          session_order?: number
          workout_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          session_order?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_workout_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "synced_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_workout_activities_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_plan_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      training_workout_goals: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_workout_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "training_workout_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_workout_goals_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_plan_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          created_at: string
          id: string
          installed_at: string
          module_id: string
          settings: Json
          status: string
          uninstalled_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installed_at?: string
          module_id: string
          settings?: Json
          status?: string
          uninstalled_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installed_at?: string
          module_id?: string
          settings?: Json
          status?: string
          uninstalled_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_nav_preferences: {
        Row: {
          module_order: string[]
          module_pinned: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          module_order?: string[]
          module_pinned?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          module_order?: string[]
          module_pinned?: string[]
          updated_at?: string
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
      user_values: {
        Row: {
          created_at: string
          feeling: string | null
          id: string
          is_archived: boolean
          label: string
          order_index: number
          statement: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["value_visibility"]
        }
        Insert: {
          created_at?: string
          feeling?: string | null
          id?: string
          is_archived?: boolean
          label: string
          order_index?: number
          statement?: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["value_visibility"]
        }
        Update: {
          created_at?: string
          feeling?: string | null
          id?: string
          is_archived?: boolean
          label?: string
          order_index?: number
          statement?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["value_visibility"]
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
          resolution: Database["public"]["Enums"]["objective_resolution"]
          resolved_at: string | null
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
          resolution?: Database["public"]["Enums"]["objective_resolution"]
          resolved_at?: string | null
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
          resolution?: Database["public"]["Enums"]["objective_resolution"]
          resolved_at?: string | null
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
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
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
          feedback_commitment: string | null
          honest_conversation: string | null
          id: string
          identity_reflection: string | null
          is_completed: boolean
          last_week_reflection: string | null
          relationship_investment: string | null
          trusted_advisors: string | null
          updated_at: string
          user_id: string
          week_intention: string | null
          week_start: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          feedback_commitment?: string | null
          honest_conversation?: string | null
          id?: string
          identity_reflection?: string | null
          is_completed?: boolean
          last_week_reflection?: string | null
          relationship_investment?: string | null
          trusted_advisors?: string | null
          updated_at?: string
          user_id: string
          week_intention?: string | null
          week_start: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          feedback_commitment?: string | null
          honest_conversation?: string | null
          id?: string
          identity_reflection?: string | null
          is_completed?: boolean
          last_week_reflection?: string | null
          relationship_investment?: string | null
          trusted_advisors?: string | null
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
      workout_preferences: {
        Row: {
          auto_create_weekly_objective: boolean
          auto_link_activities: boolean
          created_at: string
          default_goal_id: string | null
          distance_unit: string
          elevation_unit: string
          id: string
          pace_format: string
          power_display: string
          temperature_unit: string
          updated_at: string
          user_id: string
          weekly_objective_template: string
          weight_unit: string
        }
        Insert: {
          auto_create_weekly_objective?: boolean
          auto_link_activities?: boolean
          created_at?: string
          default_goal_id?: string | null
          distance_unit?: string
          elevation_unit?: string
          id?: string
          pace_format?: string
          power_display?: string
          temperature_unit?: string
          updated_at?: string
          user_id: string
          weekly_objective_template?: string
          weight_unit?: string
        }
        Update: {
          auto_create_weekly_objective?: boolean
          auto_link_activities?: boolean
          created_at?: string
          default_goal_id?: string | null
          distance_unit?: string
          elevation_unit?: string
          id?: string
          pace_format?: string
          power_display?: string
          temperature_unit?: string
          updated_at?: string
          user_id?: string
          weekly_objective_template?: string
          weight_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_preferences_default_goal_id_fkey"
            columns: ["default_goal_id"]
            isOneToOne: false
            referencedRelation: "goal_values_alignment"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "workout_preferences_default_goal_id_fkey"
            columns: ["default_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      goal_values_alignment: {
        Row: {
          goal_id: string | null
          linked_count: number | null
          score: number | null
          total_values: number | null
          user_id: string | null
          weight_sum: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          cover_photo_position: number | null
          cover_photo_url: string | null
          created_at: string | null
          email_contact: string | null
          full_name: string | null
          github_url: string | null
          id: string | null
          instagram_url: string | null
          is_profile_complete: boolean | null
          last_active_at: string | null
          linkedin_url: string | null
          medium_url: string | null
          signal_url: string | null
          snapchat_url: string | null
          social_links_order: string[] | null
          substack_url: string | null
          telegram_url: string | null
          tiktok_url: string | null
          timezone: string | null
          twitter_url: string | null
          website_url: string | null
          whatsapp_url: string | null
          youtube_url: string | null
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          cover_photo_position?: number | null
          cover_photo_url?: string | null
          created_at?: string | null
          email_contact?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          last_active_at?: string | null
          linkedin_url?: string | null
          medium_url?: string | null
          signal_url?: string | null
          snapchat_url?: string | null
          social_links_order?: string[] | null
          substack_url?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          timezone?: string | null
          twitter_url?: string | null
          website_url?: string | null
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          cover_photo_position?: number | null
          cover_photo_url?: string | null
          created_at?: string | null
          email_contact?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          last_active_at?: string | null
          linkedin_url?: string | null
          medium_url?: string | null
          signal_url?: string | null
          snapchat_url?: string | null
          social_links_order?: string[] | null
          substack_url?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          timezone?: string | null
          twitter_url?: string | null
          website_url?: string | null
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      social_post_latest_metrics: {
        Row: {
          comments: number | null
          created_at: string | null
          engagement_rate: number | null
          followers_gained: number | null
          id: string | null
          impressions: number | null
          link_clicks: number | null
          metrics_as_of: string | null
          platform: Database["public"]["Enums"]["social_platform"] | null
          post_id: string | null
          profile_views: number | null
          reach: number | null
          reactions: number | null
          reposts: number | null
          saves: number | null
          sends: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_user_ai_features: {
        Args: { _user_id: string }
        Returns: boolean
      }
      are_friends: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: boolean
      }
      backfill_missing_profiles: { Args: never; Returns: number }
      create_mcp_api_token: { Args: { p_name: string }; Returns: string }
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
      find_kujituma_matches: {
        Args: { _emails?: string[]; _linkedins?: string[]; _phones?: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          matched_email: boolean
          matched_linkedin: boolean
          matched_phone: boolean
          user_id: string
        }[]
      }
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
      get_my_private_profile: {
        Args: never
        Returns: {
          ai_features_enabled: boolean
          date_of_birth: string
          email: string
          google_id: string
          phone_number: string
          phone_verified: boolean
        }[]
      }
      get_partner_dashboard_data: {
        Args: { p_partner_id: string; p_week_start: string }
        Returns: Json
      }
      get_partner_weekly_completion_stats: {
        Args: { p_partner_id: string; p_weeks?: number }
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
      get_safe_check_in_data: {
        Args: { p_user_id: string }
        Returns: {
          blocker: string | null
          check_in_date: string
          created_at: string
          custom_answers: Json | null
          energy_level: number | null
          focus_today: string | null
          id: string
          journal_entry: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          mood_rating: number | null
          quick_win: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "daily_check_ins"
          isOneToOne: false
          isSetofReturn: true
        }
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
      has_module: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
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
      purge_old_sync_run_logs: { Args: never; Returns: undefined }
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
      validate_mcp_api_token: { Args: { p_token: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      goal_value_link_source: "ai" | "user"
      media_review_status: "pending" | "approved" | "rejected"
      media_sentiment: "positive" | "neutral" | "negative"
      media_source: "manual" | "google-alert" | "mcp-agent" | "import"
      media_status: "Published" | "Upcoming" | "Draft"
      media_type:
        | "Article"
        | "Video"
        | "Article + Video"
        | "Podcast"
        | "Panel / Speaking"
        | "Press Conference"
        | "Interview"
        | "Quote"
        | "Social"
      media_url_status: "verified" | "verify" | "needs-url" | "no-url" | "dead"
      objective_resolution: "none" | "completed" | "deprioritized" | "abandoned"
      social_platform: "linkedin" | "x" | "instagram" | "tiktok"
      social_status:
        | "idea"
        | "drafting"
        | "in_review"
        | "ready"
        | "scheduled"
        | "published"
      social_trust_check: "passes" | "needs_work" | "not_checked"
      training_event_type: "injury_illness" | "race" | "other"
      value_visibility: "private" | "public"
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
      goal_value_link_source: ["ai", "user"],
      media_review_status: ["pending", "approved", "rejected"],
      media_sentiment: ["positive", "neutral", "negative"],
      media_source: ["manual", "google-alert", "mcp-agent", "import"],
      media_status: ["Published", "Upcoming", "Draft"],
      media_type: [
        "Article",
        "Video",
        "Article + Video",
        "Podcast",
        "Panel / Speaking",
        "Press Conference",
        "Interview",
        "Quote",
        "Social",
      ],
      media_url_status: ["verified", "verify", "needs-url", "no-url", "dead"],
      objective_resolution: ["none", "completed", "deprioritized", "abandoned"],
      social_platform: ["linkedin", "x", "instagram", "tiktok"],
      social_status: [
        "idea",
        "drafting",
        "in_review",
        "ready",
        "scheduled",
        "published",
      ],
      social_trust_check: ["passes", "needs_work", "not_checked"],
      training_event_type: ["injury_illness", "race", "other"],
      value_visibility: ["private", "public"],
    },
  },
} as const
