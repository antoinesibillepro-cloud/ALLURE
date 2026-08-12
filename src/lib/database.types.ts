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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      club_invites: {
        Row: {
          club_id: string
          code: string
          created_at: string
          max_uses: number
          role: Database["public"]["Enums"]["user_role"]
          uses: number
        }
        Insert: {
          club_id: string
          code: string
          created_at?: string
          max_uses?: number
          role: Database["public"]["Enums"]["user_role"]
          uses?: number
        }
        Update: {
          club_id?: string
          code?: string
          created_at?: string
          max_uses?: number
          role?: Database["public"]["Enums"]["user_role"]
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_invites_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          name: string
          primary_color: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          primary_color?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          primary_color?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          group_id: string | null
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          title: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          group_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          title?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          group_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          date: string
          fatigue: number | null
          motivation: number | null
          profile_id: string
          sleep: number | null
          soreness: number | null
          stress: number | null
        }
        Insert: {
          date: string
          fatigue?: number | null
          motivation?: number | null
          profile_id: string
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
        }
        Update: {
          date?: string
          fatigue?: number | null
          motivation?: number | null
          profile_id?: string
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          profile_id: string
        }
        Insert: {
          group_id: string
          profile_id: string
        }
        Update: {
          group_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          id: string
          level: string | null
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          id?: string
          level?: string | null
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          level?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          date: string
          discipline: string
          id: string
          is_season_best: boolean
          profile_id: string
          value: string
        }
        Insert: {
          date: string
          discipline: string
          id?: string
          is_season_best?: boolean
          profile_id: string
          value: string
        }
        Update: {
          date?: string
          discipline?: string
          id?: string
          is_season_best?: boolean
          profile_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          category: string | null
          club_id: string
          created_at: string
          email: string
          ffa_licence_url: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          vma: number | null
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          club_id: string
          created_at?: string
          email: string
          ffa_licence_url?: string | null
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          vma?: number | null
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          club_id?: string
          created_at?: string
          email?: string
          ffa_licence_url?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          vma?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_assignments: {
        Row: {
          group_id: string
          session_id: string
        }
        Insert: {
          group_id: string
          session_id: string
        }
        Update: {
          group_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_completions: {
        Row: {
          completed_at: string
          free_session_distance_km: number | null
          free_session_duration_min: number | null
          free_session_title: string | null
          id: string
          note: string | null
          profile_id: string
          rpe: number | null
          session_id: string | null
          status: Database["public"]["Enums"]["completion_status"]
        }
        Insert: {
          completed_at?: string
          free_session_distance_km?: number | null
          free_session_duration_min?: number | null
          free_session_title?: string | null
          id?: string
          note?: string | null
          profile_id: string
          rpe?: number | null
          session_id?: string | null
          status: Database["public"]["Enums"]["completion_status"]
        }
        Update: {
          completed_at?: string
          free_session_distance_km?: number | null
          free_session_duration_min?: number | null
          free_session_title?: string | null
          id?: string
          note?: string | null
          profile_id?: string
          rpe?: number | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["completion_status"]
        }
        Relationships: [
          {
            foreignKeyName: "session_completions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          club_id: string
          coach_id: string
          cooldown: string | null
          created_at: string
          description: string | null
          distance_km: number | null
          duration_min: number | null
          id: string
          main_set: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["session_status"]
          title: string
          type: string
          vma_percent: number | null
          warmup: string | null
        }
        Insert: {
          club_id: string
          coach_id: string
          cooldown?: string | null
          created_at?: string
          description?: string | null
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          main_set?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          type: string
          vma_percent?: number | null
          warmup?: string | null
        }
        Update: {
          club_id?: string
          coach_id?: string
          cooldown?: string | null
          created_at?: string
          description?: string | null
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          main_set?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          type?: string
          vma_percent?: number | null
          warmup?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_accounts: {
        Row: {
          access_token: string
          connected_at: string
          expires_at: string
          profile_id: string
          refresh_token: string
          scope: string
          strava_athlete_id: number
        }
        Insert: {
          access_token: string
          connected_at?: string
          expires_at: string
          profile_id: string
          refresh_token: string
          scope: string
          strava_athlete_id: number
        }
        Update: {
          access_token?: string
          connected_at?: string
          expires_at?: string
          profile_id?: string
          refresh_token?: string
          scope?: string
          strava_athlete_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "strava_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_activities: {
        Row: {
          created_at: string
          distance_m: number
          id: string
          moving_time_s: number
          name: string
          profile_id: string
          start_date: string
          strava_id: number
          type: string
        }
        Insert: {
          created_at?: string
          distance_m?: number
          id?: string
          moving_time_s?: number
          name: string
          profile_id: string
          start_date: string
          strava_id: number
          type: string
        }
        Update: {
          created_at?: string
          distance_m?: number
          id?: string
          moving_time_s?: number
          name?: string
          profile_id?: string
          start_date?: string
          strava_id?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "strava_activities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: { Args: { gid: string }; Returns: boolean }
      join_club_with_invite: {
        Args: { display_name: string; invite_code: string }
        Returns: undefined
      }
      my_club_id: { Args: never; Returns: string }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      completion_status: "done" | "skipped" | "free_session"
      conversation_kind: "dm" | "group" | "announcement"
      session_status: "draft" | "published"
      user_role: "athlete" | "coach"
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
      completion_status: ["done", "skipped", "free_session"],
      conversation_kind: ["dm", "group", "announcement"],
      session_status: ["draft", "published"],
      user_role: ["athlete", "coach"],
    },
  },
} as const
