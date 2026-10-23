import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ParashaPodcastHero } from '@/components/podcast/ParashaPodcastHero';
import { PodcastDownloadButton } from '@/components/podcast/PodcastDownloadButton';
import { PodcastEpisodeInfo } from '@/components/podcast/PodcastEpisodeInfo';
import {
  PodcastHeroSkeleton,
  PodcastPlayerMetadataSkeleton,
} from '@/components/podcast/PodcastSkeleton';
import { PodcastProgressBar } from '@/components/podcast/PodcastProgressBar';
import { PodcastSpeedSelector } from '@/components/podcast/PodcastSpeedSelector';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { UseParashaPodcastResult } from '@/hooks/useParashaPodcast';
import { sharePodcastEpisode } from '@/services/podcast/sharePodcastEpisode';
import { formatPodcastDuration } from '@/utils/podcastFormat';

interface ParashaPodcastPlayerProps {
  podcast: UseParashaPodcastResult;
}

export function ParashaPodcastPlayer({ podcast }: ParashaPodcastPlayerProps) {
  const [isSharing, setIsSharing] = useState(false);
  const {
    episode,
    isEpisodeLoading,
    episodeError,
    hasResumePosition,
    isEpisodeCompleted,
    resumePositionSeconds,
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
  } = podcast;

  if (isEpisodeLoading) {
    return (
      <View style={{ paddingVertical: spacing.lg }}>
        <PodcastHeroSkeleton />
        <PodcastPlayerMetadataSkeleton />
      </View>
    );
  }

  if (!episode) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.xxl,
        }}
      >
        <Text style={{ fontSize: 40, marginBottom: spacing.md }}>🎙️</Text>
        <Text style={[typography.subtitle, { textAlign: 'center' }]}>
          הפרק של פרשת השבוע עדיין בהכנה
        </Text>
        <Text
          style={[
            typography.bodySmall,
            {
              marginTop: spacing.sm,
              color: colors.muted,
              textAlign: 'center',
            },
          ]}
        >
          {episodeError ??
            'תוכן חדש יופיע כאן כאשר הפרק יהיה מוכן.'}
        </Text>
      </View>
    );
  }

  const playPauseLabel = isPlaying
    ? `השהה את פרק פרשת ${episode.hebrewTitle}`
    : `הפעל את פרק פרשת ${episode.hebrewTitle}`;

  const primaryActionLabel = isEpisodeCompleted
    ? 'האזנה מחדש'
    : hasResumePosition
      ? `המשך מ־${formatPodcastDuration(resumePositionSeconds)}`
      : null;

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await sharePodcastEpisode(episode);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ParashaPodcastHero episode={episode} />

      {isOfflineAvailable ? (
        <Text
          style={[
            typography.caption,
            {
              marginTop: spacing.sm,
              textAlign: 'center',
              color: colors.success,
            },
          ]}
        >
          זמין אופליין
        </Text>
      ) : null}

      {isWebPlaybackLimited ? (
        <Text
          style={[
            typography.caption,
            {
              marginTop: spacing.md,
              textAlign: 'center',
              color: colors.muted,
            },
          ]}
        >
          האזנה ברקע עשויה להיות מוגבלת בתצוגת דפדפן
        </Text>
      ) : null}

      {primaryActionLabel && !isPlaying ? (
        <Pressable
          onPress={
            isEpisodeCompleted ? restartEpisode : resumeFromSavedPosition
          }
          accessibilityRole="button"
          accessibilityLabel={primaryActionLabel}
          className="rounded-xl px-4 py-3"
          style={{
            alignSelf: 'center',
            marginTop: spacing.md,
            backgroundColor: colors.secondary,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text style={[typography.label, { color: colors.white }]}>
            {primaryActionLabel}
          </Text>
        </Pressable>
      ) : null}

      <View style={{ marginTop: spacing.xl }}>
        <PodcastProgressBar
          positionSeconds={positionSeconds}
          durationSeconds={durationSeconds}
          onSeek={seek}
          disabled={isAudioLoading || playbackState === 'offline'}
        />
      </View>

      <View
        className="flex-row items-center justify-center"
        style={{ marginTop: spacing.lg, gap: spacing.md }}
      >
        <Pressable
          onPress={skipBack}
          accessibilityRole="button"
          accessibilityLabel="דלג 15 שניות אחורה"
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 48,
            minWidth: 72,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={typography.label}>⏪ 15</Text>
        </Pressable>

        <Pressable
          onPress={togglePlayback}
          disabled={isAudioLoading || playbackState === 'offline'}
          accessibilityRole="button"
          accessibilityLabel={playPauseLabel}
          accessibilityState={{ selected: isPlaying }}
          className="rounded-full px-6 py-4"
          style={{
            backgroundColor: colors.accent,
            minHeight: 72,
            minWidth: 72,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isAudioLoading ? 0.5 : 1,
          }}
        >
          <Text style={[typography.title, { color: colors.white, fontSize: 28 }]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </Pressable>

        <Pressable
          onPress={skipForward}
          accessibilityRole="button"
          accessibilityLabel="דלג 15 שניות קדימה"
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 48,
            minWidth: 72,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={typography.label}>15 ⏩</Text>
        </Pressable>
      </View>

      {isAudioLoading ? (
        <Text
          style={[
            typography.caption,
            {
              marginTop: spacing.md,
              textAlign: 'center',
              color: colors.muted,
            },
          ]}
        >
          טוען אודיו...
        </Text>
      ) : null}

      {audioError ? (
        <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
          <Text
            style={[
              typography.caption,
              {
                textAlign: 'center',
                color: colors.error,
              },
            ]}
          >
            {audioError}
          </Text>
          <Pressable
            onPress={retryPlayback}
            accessibilityRole="button"
            accessibilityLabel="נסה שוב לטעון את הפרק"
            className="rounded-xl px-4 py-2"
            style={{
              marginTop: spacing.sm,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 44,
              justifyContent: 'center',
            }}
          >
            <Text style={typography.label}>נסה שוב</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xl }}>
        <PodcastSpeedSelector
          speed={playbackSpeed}
          onSelectSpeed={setPlaybackSpeed}
          disabled={playbackState === 'offline'}
        />
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <PodcastDownloadButton
          downloadState={downloadState}
          isOfflineAvailable={isOfflineAvailable}
          downloadError={downloadError}
          onDownload={() => {
            void downloadEpisode();
          }}
          onRemoveDownload={() => {
            void removeDownload();
          }}
          disabled={false}
        />
      </View>

      <Pressable
        onPress={() => {
          void handleShare();
        }}
        disabled={isSharing}
        accessibilityRole="button"
        accessibilityLabel={`שיתוף פרק פרשת ${episode.hebrewTitle}`}
        className="rounded-xl px-4 py-3"
        style={{
          marginTop: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isSharing ? 0.6 : 1,
        }}
      >
        <Text style={typography.label}>שיתוף הפרק</Text>
      </Pressable>

      <PodcastEpisodeInfo episode={episode} />
    </View>
  );
}
