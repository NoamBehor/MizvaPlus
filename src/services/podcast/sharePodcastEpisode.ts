import { Platform, Share } from 'react-native';

import type { ParashaPodcastEpisode } from '@/types/podcast';

export async function sharePodcastEpisode(
  episode: ParashaPodcastEpisode,
): Promise<boolean> {
  const message = [
    `פודקאסט פרשת השבוע — ${episode.hebrewTitle}`,
    '',
    episode.description,
    '',
    `פרק השבוע · ${episode.parashaKey}`,
  ].join('\n');

  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message, title: episode.hebrewTitle }
        : { message, title: episode.hebrewTitle },
    );

    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
