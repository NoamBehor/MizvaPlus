export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'error';

export interface CloudProfile {
  id: string;
  display_name: string;
  xp: number;
  level: number;
  streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudMitzvahPreference {
  user_id: string;
  mitzvah_id: string;
  enabled: boolean;
  reminder_enabled: boolean;
  reminder_hour: number | null;
  reminder_minute: number | null;
  created_at: string;
  updated_at: string;
}

export interface CloudMitzvahCompletion {
  id: string;
  user_id: string;
  mitzvah_id: string;
  activity_date: string;
  completed_at: string;
  xp_awarded: number;
  created_at: string;
}

export interface CloudQuizAttempt {
  id: string;
  user_id: string;
  quiz_date: string;
  question_id: string;
  selected_option_id: string;
  is_correct: boolean;
  xp_awarded: number;
  created_at: string;
}

export interface CloudUserBadge {
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  created_at: string;
}

export interface CloudOnboardingState {
  user_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface CloudSnapshot {
  profile: CloudProfile | null;
  preferences: CloudMitzvahPreference[];
  completions: CloudMitzvahCompletion[];
  quizAttempts: CloudQuizAttempt[];
  badges: CloudUserBadge[];
  onboarding: CloudOnboardingState | null;
}

export const SYNC_TIMEOUT_MS = 12_000;
