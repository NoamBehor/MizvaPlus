export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          xp: number;
          level: number;
          streak: number;
          last_activity_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          xp?: number;
          level?: number;
          streak?: number;
          last_activity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          xp?: number;
          level?: number;
          streak?: number;
          last_activity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mitzvah_preferences: {
        Row: {
          user_id: string;
          mitzvah_id: string;
          enabled: boolean;
          reminder_enabled: boolean;
          reminder_hour: number | null;
          reminder_minute: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          mitzvah_id: string;
          enabled?: boolean;
          reminder_enabled?: boolean;
          reminder_hour?: number | null;
          reminder_minute?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          mitzvah_id?: string;
          enabled?: boolean;
          reminder_enabled?: boolean;
          reminder_hour?: number | null;
          reminder_minute?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mitzvah_completions: {
        Row: {
          id: string;
          user_id: string;
          mitzvah_id: string;
          activity_date: string;
          completed_at: string;
          xp_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mitzvah_id: string;
          activity_date: string;
          completed_at?: string;
          xp_awarded?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mitzvah_id?: string;
          activity_date?: string;
          completed_at?: string;
          xp_awarded?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          quiz_date: string;
          question_id: string;
          selected_option_id: string;
          is_correct: boolean;
          xp_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_date: string;
          question_id: string;
          selected_option_id: string;
          is_correct?: boolean;
          xp_awarded?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_date?: string;
          question_id?: string;
          selected_option_id?: string;
          is_correct?: boolean;
          xp_awarded?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          unlocked_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          unlocked_at?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          unlocked_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      onboarding_state: {
        Row: {
          user_id: string;
          completed: boolean;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          completed?: boolean;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          completed?: boolean;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
