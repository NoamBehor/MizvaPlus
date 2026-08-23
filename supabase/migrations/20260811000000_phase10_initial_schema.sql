-- Phase 10: Supabase cloud persistence schema
-- Offline-first sync target tables with RLS and idempotency constraints

-- ─── updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── profiles ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles(updated_at);

-- Auto-create profile row on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'משתמש')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── mitzvah_preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mitzvah_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mitzvah_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_hour INTEGER CHECK (reminder_hour IS NULL OR (reminder_hour >= 0 AND reminder_hour <= 23)),
  reminder_minute INTEGER CHECK (reminder_minute IS NULL OR (reminder_minute >= 0 AND reminder_minute <= 59)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mitzvah_id)
);

CREATE TRIGGER mitzvah_preferences_set_updated_at
  BEFORE UPDATE ON public.mitzvah_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS mitzvah_preferences_user_updated_idx
  ON public.mitzvah_preferences(user_id, updated_at);

-- ─── mitzvah_completions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mitzvah_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mitzvah_id TEXT NOT NULL,
  activity_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mitzvah_completions_unique_activity
    UNIQUE (user_id, mitzvah_id, activity_date)
);

CREATE INDEX IF NOT EXISTS mitzvah_completions_user_date_idx
  ON public.mitzvah_completions(user_id, activity_date);

-- ─── quiz_attempts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_date DATE NOT NULL,
  question_id TEXT NOT NULL,
  selected_option_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quiz_attempts_unique_daily
    UNIQUE (user_id, quiz_date, question_id)
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_date_idx
  ON public.quiz_attempts(user_id, quiz_date);

-- ─── user_badges ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- ─── onboarding_state ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.onboarding_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER onboarding_state_set_updated_at
  BEFORE UPDATE ON public.onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitzvah_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitzvah_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- mitzvah_preferences
CREATE POLICY mitzvah_preferences_select_own ON public.mitzvah_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY mitzvah_preferences_insert_own ON public.mitzvah_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mitzvah_preferences_update_own ON public.mitzvah_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY mitzvah_preferences_delete_own ON public.mitzvah_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- mitzvah_completions
CREATE POLICY mitzvah_completions_select_own ON public.mitzvah_completions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY mitzvah_completions_insert_own ON public.mitzvah_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mitzvah_completions_update_own ON public.mitzvah_completions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY mitzvah_completions_delete_own ON public.mitzvah_completions
  FOR DELETE USING (auth.uid() = user_id);

-- quiz_attempts
CREATE POLICY quiz_attempts_select_own ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quiz_attempts_insert_own ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quiz_attempts_update_own ON public.quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY quiz_attempts_delete_own ON public.quiz_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- user_badges
CREATE POLICY user_badges_select_own ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_badges_insert_own ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_badges_update_own ON public.user_badges
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_badges_delete_own ON public.user_badges
  FOR DELETE USING (auth.uid() = user_id);

-- onboarding_state
CREATE POLICY onboarding_state_select_own ON public.onboarding_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY onboarding_state_insert_own ON public.onboarding_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY onboarding_state_update_own ON public.onboarding_state
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY onboarding_state_delete_own ON public.onboarding_state
  FOR DELETE USING (auth.uid() = user_id);
