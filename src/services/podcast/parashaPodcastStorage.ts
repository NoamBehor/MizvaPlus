import {
  PODCAST_PLAYBACK_SPEEDS,
  type PodcastDownloadRecord,
  type PodcastPlaybackSpeed,
  type PodcastProgressRecord,
} from '@/types/podcast';
import { getJson, setJson, STORAGE_KEYS } from '@/utils/storage';

export function podcastProgressStorageKey(parashaKey: string): string {
  return `${STORAGE_KEYS.podcastProgressPrefix}:${parashaKey}`;
}

function isPodcastPlaybackSpeed(value: number): value is PodcastPlaybackSpeed {
  return (PODCAST_PLAYBACK_SPEEDS as readonly number[]).includes(value);
}

export async function getPodcastProgress(
  parashaKey: string,
): Promise<PodcastProgressRecord | null> {
  const stored = await getJson<PodcastProgressRecord>(
    podcastProgressStorageKey(parashaKey),
  );

  if (
    !stored ||
    typeof stored.episodeId !== 'string' ||
    typeof stored.parashaKey !== 'string' ||
    typeof stored.positionSeconds !== 'number' ||
    typeof stored.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    ...stored,
    durationSeconds:
      typeof stored.durationSeconds === 'number' ? stored.durationSeconds : 0,
  };
}

export async function savePodcastProgress(
  progress: Omit<PodcastProgressRecord, 'updatedAt'>,
): Promise<void> {
  const payload: PodcastProgressRecord = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };

  await setJson(podcastProgressStorageKey(progress.parashaKey), payload);
}

export async function getPodcastPlaybackSpeed(): Promise<PodcastPlaybackSpeed> {
  const stored = await getJson<number>(STORAGE_KEYS.podcastPlaybackSpeed);
  if (typeof stored === 'number' && isPodcastPlaybackSpeed(stored)) {
    return stored;
  }

  return 1;
}

export async function setPodcastPlaybackSpeed(
  speed: PodcastPlaybackSpeed,
): Promise<void> {
  await setJson(STORAGE_KEYS.podcastPlaybackSpeed, speed);
}

export async function getPodcastDownloads(): Promise<
  Record<string, PodcastDownloadRecord>
> {
  const stored = await getJson<Record<string, PodcastDownloadRecord>>(
    STORAGE_KEYS.podcastDownloads,
  );

  if (!stored || typeof stored !== 'object') {
    return {};
  }

  return stored;
}

export async function savePodcastDownload(
  record: PodcastDownloadRecord,
): Promise<void> {
  const downloads = await getPodcastDownloads();
  downloads[record.episodeId] = record;
  await setJson(STORAGE_KEYS.podcastDownloads, downloads);
}

export async function removePodcastDownload(episodeId: string): Promise<void> {
  const downloads = await getPodcastDownloads();
  delete downloads[episodeId];
  await setJson(STORAGE_KEYS.podcastDownloads, downloads);
}
