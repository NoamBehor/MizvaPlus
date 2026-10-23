import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { PodcastCardSkeleton } from '@/components/podcast/PodcastSkeleton';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useParashaPodcastContext } from '@/context/ParashaPodcastContext';
import { navigateToParashaPodcastPlayer } from '@/navigation/navigationRef';
import type { CalendarDayInfo } from '@/types/calendar';
import {
  formatPodcastDuration,
  formatPodcastDurationLabel,
} from '@/utils/podcastFormat';

interface ParashaPodcastCardProps {
  dayInfo: CalendarDayInfo | null;
  isLoading: boolean;
}

function getPrimaryCtaLabel({
  hasResumePosition,
  isEpisodeCompleted,
  resumePositionSeconds,
}: {
  hasResumePosition: boolean;
  isEpisodeCompleted: boolean;
  resumePositionSeconds: number;
}): string {
  if (isEpisodeCompleted) {
    return 'נגן שוב';
  }

  if (hasResumePosition) {
    return `המשך מ־${formatPodcastDuration(resumePositionSeconds)}`;
  }

  return 'האזנה';
}

export function ParashaPodcastCard({
  dayInfo: _dayInfo,
  isLoading,
}: ParashaPodcastCardProps) {
  const {
    episode,
    isEpisodeLoading,
    episodeError,
    hasResumePosition,
    isEpisodeCompleted,
    resumePositionSeconds,
  } = useParashaPodcastContext();

  const isCardLoading = isLoading || isEpisodeLoading;

  if (isCardLoading) {
    return (
      <Card className="mb-4 mt-2">
        <PodcastCardSkeleton />
      </Card>
    );
  }

  if (!episode) {
    return (
      <Card className="mb-4 mt-2">
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            alignItems: 'flex-start',
          }}
        >
          <Text style={[typography.caption, { color: colors.muted }]}>
            🎙️ פודקאסט פרשת השבוע
          </Text>
          <Text
            style={[
              typography.bodySmall,
              {
                marginTop: spacing.sm,
                textAlign: 'right',
                writingDirection: 'rtl',
              },
            ]}
          >
            הפרק של פרשת השבוע עדיין בהכנה
          </Text>
          <Text
            style={[
              typography.caption,
              {
                marginTop: spacing.xs,
                color: colors.muted,
              },
            ]}
          >
            {episodeError ??
              'תוכן חדש יופיע כאן כאשר הפרק יהיה מוכן.'}
          </Text>
        </View>
      </Card>
    );
  }

  const durationLabel = formatPodcastDurationLabel(episode.durationSeconds);
  const ctaLabel = getPrimaryCtaLabel({
    hasResumePosition,
    isEpisodeCompleted,
    resumePositionSeconds,
  });

  return (
    <Card className="mb-4 mt-2">
      <Pressable
        onPress={navigateToParashaPodcastPlayer}
        accessibilityRole="button"
        accessibilityLabel={`${ctaLabel} לפרשת ${episode.hebrewTitle}`}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text style={[typography.caption, { color: colors.muted }]}>
            🎙️ פודקאסט פרשת השבוע
          </Text>

          <Text
            style={[
              typography.subtitle,
              {
                color: colors.text,
                marginTop: spacing.xs,
                textAlign: 'right',
                writingDirection: 'rtl',
              },
            ]}
          >
            {episode.hebrewTitle}
          </Text>

          <Text
            style={[
              typography.caption,
              {
                marginTop: spacing.xs,
                color: colors.muted,
              },
            ]}
            numberOfLines={2}
          >
            {episode.description}
          </Text>

          <Text
            style={[
              typography.caption,
              {
                marginTop: spacing.sm,
                color: colors.muted,
              },
            ]}
          >
            {durationLabel} | פרק השבוע
          </Text>

          <View
            className="flex-row items-center"
            style={{ marginTop: spacing.md }}
          >
            <View
              className="rounded-xl px-4 py-2"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 40,
                justifyContent: 'center',
              }}
            >
              <Text style={[typography.label, { color: colors.secondary }]}>
                {ctaLabel === 'האזנה' ? `▶ ${ctaLabel}` : ctaLabel}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}
