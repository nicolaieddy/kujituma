export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      goals: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          notes: string | null
          order_index: number | null
          status: string
          target_date: string | null
          timeframe: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          notes?: string | null
          order_index?: number | null
          status?: string
          target_date?: string | null
          timeframe: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          notes?: string | null
          order_index?: number | null
          status?: string
          target_date?: string | null
          timeframe?: string
          title?: string
          updated_at?: string
          user_id?: string
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_comment_id: string | null
          related_post_id: string | null
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
          related_post_id?: string | null
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
          related_post_id?: string | null
          triggered_by_user_id?: string
          type?: string
          updated_at?: string
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
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          google_id: string | null
          id: string
          last_active_at: string | null
          linkedin_url: string | null
          updated_at: string
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          google_id?: string | null
          id: string
          last_active_at?: string | null
          linkedin_url?: string | null
          updated_at?: string
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          google_id?: string | null
          id?: string
          last_active_at?: string | null
          linkedin_url?: string | null
          updated_at?: string
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
      create_notification: {
        Args: {
          _user_id: string
          _type: string
          _message: string
          _related_post_id?: string
          _related_comment_id?: string
          _triggered_by_user_id?: string
        }
        Returns: string
      }
      delete_all_weekly_objectives: {
        Args: { _user_id: string; _week_start: string }
        Returns: number
      }
      get_admin_users_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          full_name: string
          avatar_url: string
          created_at: string
          posts_count: number
          role: string
          last_active_at: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
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
      toggle_comment_like: {
        Args: { _user_id: string; _comment_id: string }
        Returns: boolean
      }
      toggle_post_like: {
        Args: { _user_id: string; _post_id: string }
        Returns: boolean
      }
      update_user_last_active: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
