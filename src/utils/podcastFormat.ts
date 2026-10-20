import { sanitizePodcastSeconds } from '@/utils/podcastResume';

export function formatPodcastDuration(totalSeconds: number): string {
  const safeSeconds = sanitizePodcastSeconds(totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatPodcastDurationLabel(totalSeconds: number): string {
  return formatPodcastDuration(totalSeconds);
}

export function formatPodcastPublishedDate(publishedAt: string): string | null {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
