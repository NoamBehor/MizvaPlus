import {
  deleteAsync,
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import {
  getPodcastDownloads,
  removePodcastDownload,
  savePodcastDownload,
} from '@/services/podcast/parashaPodcastStorage';
import type { ParashaPodcastEpisode } from '@/types/podcast';

const PODCAST_DIRECTORY = `${documentDirectory ?? ''}podcasts/`;

function getLocalPodcastPath(episodeId: string): string {
  return `${PODCAST_DIRECTORY}${episodeId}.mp3`;
}

export function isPodcastDownloadSupported(): boolean {
  return Platform.OS !== 'web' && Boolean(documentDirectory);
}

export async function isPodcastDownloaded(episodeId: string): Promise<boolean> {
  const downloads = await getPodcastDownloads();
  const record = downloads[episodeId];
  if (!record?.localUri) {
    return false;
  }

  const fileInfo = await getInfoAsync(record.localUri);
  return fileInfo.exists;
}

export async function getLocalPodcastFile(
  episodeId: string,
): Promise<string | null> {
  const downloads = await getPodcastDownloads();
  const record = downloads[episodeId];
  if (!record?.localUri) {
    return null;
  }

  const fileInfo = await getInfoAsync(record.localUri);
  return fileInfo.exists ? record.localUri : null;
}

export async function downloadPodcastEpisode(
  episode: ParashaPodcastEpisode,
): Promise<string> {
  if (!isPodcastDownloadSupported()) {
    throw new Error('podcast-download-unavailable');
  }

  if (!episode.audioUrl) {
    throw new Error('podcast-download-missing-url');
  }

  await makeDirectoryAsync(PODCAST_DIRECTORY, {
    intermediates: true,
  });

  const destination = getLocalPodcastPath(episode.id);

  try {
    const downloadResult = await downloadAsync(episode.audioUrl, destination);

    if (downloadResult.status !== 200) {
      throw new Error(`podcast-download-http-${downloadResult.status}`);
    }

    await savePodcastDownload({
      episodeId: episode.id,
      parashaKey: episode.parashaKey,
      localUri: downloadResult.uri,
      downloadedAt: new Date().toISOString(),
    });

    return downloadResult.uri;
  } catch (error) {
    await deleteAsync(destination, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

export async function deletePodcastEpisodeDownload(
  episodeId: string,
): Promise<void> {
  const localUri = await getLocalPodcastFile(episodeId);
  if (localUri) {
    await deleteAsync(localUri, { idempotent: true });
  }

  await removePodcastDownload(episodeId);
}
