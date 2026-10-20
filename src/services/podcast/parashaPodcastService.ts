import { getParashaPodcastProvider } from '@/services/podcast/parashaPodcastProvider';
import type { WeeklyParasha } from '@/types/calendar';
import type { ParashaPodcastEpisode } from '@/types/podcast';

export async function getCurrentParashaPodcast(
  weeklyParasha: WeeklyParasha | null,
): Promise<ParashaPodcastEpisode | null> {
  if (!weeklyParasha) {
    return null;
  }

  const episode =
    await getParashaPodcastProvider().getEpisodeForParasha(weeklyParasha);

  if (!episode || episode.status !== 'published') {
    return null;
  }

  return episode;
}
