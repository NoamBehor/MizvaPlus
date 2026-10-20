import {
  PODCAST_RESUME_END_BUFFER_SECONDS,
  PODCAST_RESUME_MIN_SECONDS,
} from '@/types/podcast';

export function sanitizePodcastSeconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

export function canResumePodcast(
  positionSeconds: number,
  durationSeconds: number,
): boolean {
  const position = sanitizePodcastSeconds(positionSeconds);
  const duration = sanitizePodcastSeconds(durationSeconds);

  if (duration <= 0) {
    return false;
  }

  return (
    position > PODCAST_RESUME_MIN_SECONDS &&
    position < duration - PODCAST_RESUME_END_BUFFER_SECONDS
  );
}

export function isPodcastEpisodeCompleted(
  positionSeconds: number,
  durationSeconds: number,
): boolean {
  const position = sanitizePodcastSeconds(positionSeconds);
  const duration = sanitizePodcastSeconds(durationSeconds);

  if (duration <= 0) {
    return false;
  }

  return position >= duration - PODCAST_RESUME_END_BUFFER_SECONDS;
}
