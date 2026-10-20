export type ParashaPodcastEpisodeStatus = 'draft' | 'published' | 'archived';

export type ParashaPodcastEpisode = {
  id: string;
  parashaKey: string;
  hebrewTitle: string;
  description: string;
  audioUrl: string;
  durationSeconds: number;
  weekStart: string;
  weekEnd: string;
  version: number;
  publishedAt: string;
  status: ParashaPodcastEpisodeStatus;
  scriptVersion?: string;
  thumbnailUrl?: string;
};

export type PodcastPlaybackSpeed = 1 | 1.25 | 1.5;

export const PODCAST_PLAYBACK_SPEEDS: readonly PodcastPlaybackSpeed[] = [
  1,
  1.25,
  1.5,
];

export type PodcastDownloadState =
  | 'idle'
  | 'downloading'
  | 'downloaded'
  | 'failed'
  | 'unavailable';

export type PodcastPlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'seeking'
  | 'ended'
  | 'error'
  | 'offline';

export type PodcastProgressRecord = {
  episodeId: string;
  parashaKey: string;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: string;
};

export type PodcastDownloadRecord = {
  episodeId: string;
  parashaKey: string;
  localUri: string;
  downloadedAt: string;
};

export const PODCAST_RESUME_MIN_SECONDS = 5;
export const PODCAST_RESUME_END_BUFFER_SECONDS = 10;
