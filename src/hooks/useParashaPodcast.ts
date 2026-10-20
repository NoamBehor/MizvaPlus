import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  deletePodcastEpisodeDownload,
  downloadPodcastEpisode,
  getLocalPodcastFile,
  isPodcastDownloaded,
  isPodcastDownloadSupported,
} from '@/services/podcast/parashaPodcastDownload';
import { getCurrentParashaPodcast } from '@/services/podcast/parashaPodcastService';
import {
  getPodcastPlaybackSpeed,
  getPodcastProgress,
  setPodcastPlaybackSpeed,
  savePodcastProgress,
} from '@/services/podcast/parashaPodcastStorage';
import type { WeeklyParasha } from '@/types/calendar';
import type {
  ParashaPodcastEpisode,
  PodcastDownloadState,
  PodcastPlaybackSpeed,
  PodcastPlaybackState,
  PodcastProgressRecord,
} from '@/types/podcast';
import {
  canResumePodcast,
  isPodcastEpisodeCompleted,
  sanitizePodcastSeconds,
} from '@/utils/podcastResume';

const SKIP_SECONDS = 15;
const PROGRESS_SAVE_INTERVAL_MS = 3000;

export interface UseParashaPodcastOptions {
  enablePlayback?: boolean;
}

export interface UseParashaPodcastResult {
  episode: ParashaPodcastEpisode | null;
  isEpisodeLoading: boolean;
  episodeError: string | null;
  savedProgress: PodcastProgressRecord | null;
  resumePositionSeconds: number;
  hasResumePosition: boolean;
  isEpisodeCompleted: boolean;
  playbackState: PodcastPlaybackState;
  isPlaying: boolean;
  isAudioLoading: boolean;
  audioError: string | null;
  positionSeconds: number;
  durationSeconds: number;
  playbackSpeed: PodcastPlaybackSpeed;
  downloadState: PodcastDownloadState;
  downloadError: string | null;
  isOfflineAvailable: boolean;
  isWebPlaybackLimited: boolean;
  hasActiveSession: boolean;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seek: (positionSeconds: number) => void;
  skipBack: () => void;
  skipForward: () => void;
  setPlaybackSpeed: (speed: PodcastPlaybackSpeed) => void;
  downloadEpisode: () => Promise<void>;
  removeDownload: () => Promise<void>;
  resumeFromSavedPosition: () => void;
  restartEpisode: () => void;
  retryPlayback: () => void;
}

function resolveDurationSeconds(
  statusDuration: number | undefined,
  episodeDuration: number | undefined,
): number {
  if (typeof statusDuration === 'number' && statusDuration > 0) {
    return sanitizePodcastSeconds(statusDuration);
  }

  if (typeof episodeDuration === 'number' && episodeDuration > 0) {
    return sanitizePodcastSeconds(episodeDuration);
  }

  return 0;
}

export function useParashaPodcast(
  weeklyParasha: WeeklyParasha | null,
  options: UseParashaPodcastOptions = {},
): UseParashaPodcastResult {
  const { enablePlayback = false } = options;
  const isWebPlaybackLimited = Platform.OS === 'web';

  const [episode, setEpisode] = useState<ParashaPodcastEpisode | null>(null);
  const [isEpisodeLoading, setIsEpisodeLoading] = useState(true);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] =
    useState<PodcastProgressRecord | null>(null);
  const [playbackSpeed, setPlaybackSpeedState] =
    useState<PodcastPlaybackSpeed>(1);
  const [downloadState, setDownloadState] =
    useState<PodcastDownloadState>('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadInFlightRef = useRef(false);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [localAudioUri, setLocalAudioUri] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);
  const hasAppliedResumeRef = useRef(false);
  const lastSavedPositionRef = useRef(0);

  const audioSource = useMemo(() => {
    if (!enablePlayback || !episode) {
      return null;
    }

    return localAudioUri ?? episode.audioUrl;
  }, [enablePlayback, episode, localAudioUri]);

  const player = useAudioPlayer(audioSource, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const positionSeconds = sanitizePodcastSeconds(status.currentTime ?? 0);
  const durationSeconds = resolveDurationSeconds(
    status.duration,
    episode?.durationSeconds,
  );
  const isPlaying = status.playing ?? false;
  const isAudioLoading =
    enablePlayback && Boolean(episode) && (status.isBuffering ?? false);

  const resumePositionSeconds = savedProgress?.positionSeconds ?? 0;
  const hasResumePosition = canResumePodcast(
    resumePositionSeconds,
    savedProgress?.durationSeconds ?? durationSeconds,
  );
  const isEpisodeCompleted = isPodcastEpisodeCompleted(
    resumePositionSeconds,
    savedProgress?.durationSeconds ?? durationSeconds,
  );

  const playbackState = useMemo((): PodcastPlaybackState => {
    if (!enablePlayback || !episode) {
      return 'idle';
    }

    if (isNetworkOffline && !localAudioUri) {
      return 'offline';
    }

    if (audioError) {
      return 'error';
    }

    if (isSeeking) {
      return 'seeking';
    }

    if (status.didJustFinish) {
      return 'ended';
    }

    if (isAudioLoading) {
      return 'loading';
    }

    if (isPlaying) {
      return 'playing';
    }

    if (positionSeconds > 0) {
      return 'paused';
    }

    return 'idle';
  }, [
    audioError,
    enablePlayback,
    episode,
    isAudioLoading,
    isNetworkOffline,
    isPlaying,
    isSeeking,
    localAudioUri,
    positionSeconds,
    status.didJustFinish,
  ]);

  const hasActiveSession =
    Boolean(episode) &&
    enablePlayback &&
    (isPlaying ||
      playbackState === 'paused' ||
      playbackState === 'loading' ||
      playbackState === 'seeking' ||
      playbackState === 'ended');

  useEffect(() => {
    let isCancelled = false;

    async function loadEpisode() {
      setIsEpisodeLoading(true);
      setEpisodeError(null);

      try {
        const nextEpisode = await getCurrentParashaPodcast(weeklyParasha);
        if (isCancelled) {
          return;
        }

        setEpisode(nextEpisode);

        if (!nextEpisode) {
          setSavedProgress(null);
          setDownloadState('idle');
          setIsOfflineAvailable(false);
          return;
        }

        const [progress, speed, downloaded, localUri] = await Promise.all([
          getPodcastProgress(nextEpisode.parashaKey),
          getPodcastPlaybackSpeed(),
          isPodcastDownloaded(nextEpisode.id),
          getLocalPodcastFile(nextEpisode.id),
        ]);

        if (isCancelled) {
          return;
        }

        setSavedProgress(
          progress && progress.episodeId === nextEpisode.id ? progress : null,
        );
        setPlaybackSpeedState(speed);
        setLocalAudioUri(localUri);
        setIsOfflineAvailable(Boolean(localUri));
        setDownloadState(downloaded ? 'downloaded' : 'idle');
        hasAppliedResumeRef.current = false;
      } catch {
        if (!isCancelled) {
          setEpisode(null);
          setEpisodeError('לא ניתן לטעון את פרק הפודקאסט כרגע.');
        }
      } finally {
        if (!isCancelled) {
          setIsEpisodeLoading(false);
        }
      }
    }

    void loadEpisode();

    return () => {
      isCancelled = true;
    };
  }, [
    weeklyParasha?.basename,
    weeklyParasha?.hebrewDisplayName,
    weeklyParasha?.shabbatDateKey,
  ]);

  useEffect(() => {
    if (!enablePlayback) {
      return;
    }

    player.setPlaybackRate(playbackSpeed);
  }, [enablePlayback, playbackSpeed, player]);

  useEffect(() => {
    if (!enablePlayback || !episode || !isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      const nextPosition = sanitizePodcastSeconds(player.currentTime);
      if (nextPosition === lastSavedPositionRef.current) {
        return;
      }

      lastSavedPositionRef.current = nextPosition;
      void savePodcastProgress({
        episodeId: episode.id,
        parashaKey: episode.parashaKey,
        positionSeconds: nextPosition,
        durationSeconds,
      }).then(() => {
        setSavedProgress({
          episodeId: episode.id,
          parashaKey: episode.parashaKey,
          positionSeconds: nextPosition,
          durationSeconds,
          updatedAt: new Date().toISOString(),
        });
      });
    }, PROGRESS_SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [durationSeconds, enablePlayback, episode, isPlaying, player]);

  useEffect(() => {
    if (!enablePlayback) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (episode && player.currentTime > 0) {
          void savePodcastProgress({
            episodeId: episode.id,
            parashaKey: episode.parashaKey,
            positionSeconds: sanitizePodcastSeconds(player.currentTime),
            durationSeconds,
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [durationSeconds, enablePlayback, episode, player]);

  useEffect(() => {
    if (!enablePlayback || !status.didJustFinish || !episode) {
      return;
    }

    void savePodcastProgress({
      episodeId: episode.id,
      parashaKey: episode.parashaKey,
      positionSeconds: 0,
      durationSeconds,
    });
    setSavedProgress(null);
    hasAppliedResumeRef.current = false;
  }, [durationSeconds, enablePlayback, episode, status.didJustFinish]);

  const applyResumePosition = useCallback(() => {
    if (!enablePlayback || !episode || hasAppliedResumeRef.current) {
      return;
    }

    const resumeSeconds = savedProgress?.positionSeconds ?? 0;
    const resumeDuration =
      savedProgress?.durationSeconds ?? durationSeconds;

    if (canResumePodcast(resumeSeconds, resumeDuration)) {
      player.seekTo(resumeSeconds);
      hasAppliedResumeRef.current = true;
    }
  }, [
    durationSeconds,
    enablePlayback,
    episode,
    player,
    savedProgress?.durationSeconds,
    savedProgress?.positionSeconds,
  ]);

  const play = useCallback(() => {
    if (!enablePlayback || !episode) {
      return;
    }

    if (isNetworkOffline && !localAudioUri) {
      setAudioError('נראה שאין חיבור לאינטרנט');
      return;
    }

    setAudioError(null);
    applyResumePosition();

    try {
      player.play();
    } catch {
      if (localAudioUri) {
        setAudioError('לא הצלחנו לטעון את הפרק. המשך מהגרסה שהורדת');
      } else {
        setIsNetworkOffline(true);
        setAudioError('נראה שאין חיבור לאינטרנט');
      }
    }
  }, [
    applyResumePosition,
    enablePlayback,
    episode,
    localAudioUri,
    isNetworkOffline,
    player,
  ]);

  const pause = useCallback(() => {
    if (!enablePlayback) {
      return;
    }

    player.pause();
  }, [enablePlayback, player]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }

    play();
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    (nextPosition: number) => {
      if (!enablePlayback || durationSeconds <= 0) {
        return;
      }

      const clamped = Math.max(
        0,
        Math.min(sanitizePodcastSeconds(nextPosition), durationSeconds),
      );

      setIsSeeking(true);
      player.seekTo(clamped);
      setTimeout(() => {
        setIsSeeking(false);
      }, 150);
    },
    [durationSeconds, enablePlayback, player],
  );

  const skipBack = useCallback(() => {
    seek(Math.max(0, positionSeconds - SKIP_SECONDS));
  }, [positionSeconds, seek]);

  const skipForward = useCallback(() => {
    seek(Math.min(durationSeconds, positionSeconds + SKIP_SECONDS));
  }, [durationSeconds, positionSeconds, seek]);

  const setPlaybackSpeed = useCallback(
    (speed: PodcastPlaybackSpeed) => {
      setPlaybackSpeedState(speed);
      void setPodcastPlaybackSpeed(speed);

      if (enablePlayback) {
        player.setPlaybackRate(speed);
      }
    },
    [enablePlayback, player],
  );

  const downloadEpisode = useCallback(async () => {
    if (!episode) {
      return;
    }

    if (!isPodcastDownloadSupported()) {
      setDownloadState('unavailable');
      return;
    }

    if (
      downloadInFlightRef.current ||
      downloadState === 'downloading' ||
      isOfflineAvailable ||
      downloadState === 'downloaded'
    ) {
      return;
    }

    downloadInFlightRef.current = true;
    setDownloadError(null);
    setDownloadState('downloading');

    try {
      const localUri = await downloadPodcastEpisode(episode);
      setLocalAudioUri(localUri);
      setIsOfflineAvailable(true);
      setDownloadState('downloaded');
      setIsNetworkOffline(false);
    } catch {
      setDownloadState('failed');
      setDownloadError('לא הצלחנו להוריד את הפרק. בדקו את החיבור ונסו שוב.');
    } finally {
      downloadInFlightRef.current = false;
    }
  }, [downloadState, episode, isOfflineAvailable]);

  const removeDownload = useCallback(async () => {
    if (!episode) {
      return;
    }

    await deletePodcastEpisodeDownload(episode.id);
    setLocalAudioUri(null);
    setIsOfflineAvailable(false);
    setDownloadState('idle');
    setDownloadError(null);
  }, [episode]);

  const resumeFromSavedPosition = useCallback(() => {
    applyResumePosition();
    play();
  }, [applyResumePosition, play]);

  const restartEpisode = useCallback(() => {
    if (!enablePlayback || !episode) {
      return;
    }

    hasAppliedResumeRef.current = true;
    seek(0);
    void savePodcastProgress({
      episodeId: episode.id,
      parashaKey: episode.parashaKey,
      positionSeconds: 0,
      durationSeconds,
    });
    setSavedProgress(null);
    play();
  }, [durationSeconds, enablePlayback, episode, play, seek]);

  const retryPlayback = useCallback(() => {
    setAudioError(null);
    setIsNetworkOffline(false);
    play();
  }, [play]);

  return {
    episode,
    isEpisodeLoading,
    episodeError,
    savedProgress,
    resumePositionSeconds,
    hasResumePosition,
    isEpisodeCompleted,
    playbackState,
    isPlaying,
    isAudioLoading,
    audioError,
    positionSeconds,
    durationSeconds,
    playbackSpeed,
    downloadState,
    downloadError,
    isOfflineAvailable,
    isWebPlaybackLimited,
    hasActiveSession,
    play,
    pause,
    togglePlayback,
    seek,
    skipBack,
    skipForward,
    setPlaybackSpeed,
    downloadEpisode,
    removeDownload,
    resumeFromSavedPosition,
    restartEpisode,
    retryPlayback,
  };
}
