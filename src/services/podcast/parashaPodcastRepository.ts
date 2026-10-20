import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import type { WeeklyParasha } from '@/types/calendar';
import type { ParashaPodcastEpisode } from '@/types/podcast';

type ParashaPodcastEpisodeRow = {
  id: string;
  parasha_key: string;
  hebrew_title: string;
  description: string;
  audio_storage_path: string;
  duration_seconds: number;
  week_start: string;
  week_end: string;
  version: number;
  published_at: string | null;
  status: 'draft' | 'published' | 'archived';
  script_version: string | null;
  thumbnail_storage_path: string | null;
};

function resolvePublicStorageUrl(storagePath: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from('podcast').getPublicUrl(storagePath);
  return data.publicUrl;
}

function mapRowToEpisode(row: ParashaPodcastEpisodeRow): ParashaPodcastEpisode {
  const audioUrl = resolvePublicStorageUrl(row.audio_storage_path);
  const thumbnailUrl = row.thumbnail_storage_path
    ? resolvePublicStorageUrl(row.thumbnail_storage_path)
    : undefined;

  return {
    id: row.id,
    parashaKey: row.parasha_key,
    hebrewTitle: row.hebrew_title,
    description: row.description,
    audioUrl,
    durationSeconds: row.duration_seconds,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    version: row.version,
    publishedAt: row.published_at ?? row.week_end,
    status: row.status,
    scriptVersion: row.script_version ?? undefined,
    thumbnailUrl,
  };
}

export async function fetchPublishedEpisodeForParasha(
  parasha: WeeklyParasha,
): Promise<ParashaPodcastEpisode | null> {
  if (!isSupabaseConfigured() || !parasha.basename) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('parasha_podcast_episodes')
    .select(
      'id, parasha_key, hebrew_title, description, audio_storage_path, duration_seconds, week_start, week_end, version, published_at, status, script_version, thumbnail_storage_path',
    )
    .eq('parasha_key', parasha.basename)
    .eq('status', 'published')
    .lte('week_start', parasha.shabbatDateKey)
    .gte('week_end', parasha.shabbatDateKey)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[parashaPodcastRepository] fetch failed:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapRowToEpisode(data as ParashaPodcastEpisodeRow);
}
