-- Parasha Podcast: published episode metadata + public audio storage bucket
--
-- Mobile clients read only published rows (RLS). Audio uploads and episode
-- publishing are performed with the service role (bootstrap script / dashboard).

-- ─── Episode metadata ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parasha_podcast_episodes (
  id TEXT PRIMARY KEY,
  parasha_key TEXT NOT NULL,
  hebrew_title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  audio_storage_path TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  script_version TEXT,
  thumbnail_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parasha_podcast_episodes_week_range
    CHECK (week_end >= week_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS parasha_podcast_episodes_parasha_week_version_idx
  ON public.parasha_podcast_episodes (parasha_key, week_end, version);

CREATE INDEX IF NOT EXISTS parasha_podcast_episodes_published_lookup_idx
  ON public.parasha_podcast_episodes (parasha_key, week_start, week_end, status);

CREATE TRIGGER parasha_podcast_episodes_set_updated_at
  BEFORE UPDATE ON public.parasha_podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.parasha_podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY parasha_podcast_episodes_select_published
  ON public.parasha_podcast_episodes
  FOR SELECT
  USING (status = 'published');

-- ─── Storage bucket (public read for published audio URLs) ──────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcast',
  'podcast',
  true,
  104857600,
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY parasha_podcast_storage_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'podcast');
