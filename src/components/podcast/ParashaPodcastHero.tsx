import { Image, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, spacing, surfaces, typography } from '@/constants/theme';
import type { ParashaPodcastEpisode } from '@/types/podcast';
import {
  formatPodcastDuration,
  formatPodcastPublishedDate,
} from '@/utils/podcastFormat';

interface ParashaPodcastHeroProps {
  episode: ParashaPodcastEpisode;
}

export function ParashaPodcastHero({ episode }: ParashaPodcastHeroProps) {
  const publishedLabel = formatPodcastPublishedDate(episode.publishedAt);

  return (
    <View style={{ alignItems: 'center' }}>
      {episode.thumbnailUrl ? (
        <Image
          source={{ uri: episode.thumbnailUrl }}
          accessibilityIgnoresInvertColors
          style={{
            width: 160,
            height: 160,
            borderRadius: borderRadius.xxl,
            marginBottom: spacing.md,
          }}
        />
      ) : (
        <View
          style={{
            width: 160,
            height: 160,
            borderRadius: borderRadius.xxl,
            backgroundColor: surfaces.prayerSectionSurface,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 48 }}>🎙️</Text>
        </View>
      )}

      <Text
        style={[
          typography.label,
          { color: colors.muted, textAlign: 'center' },
        ]}
      >
        🎙️ פודקאסט פרשת השבוע
      </Text>

      <Text
        style={[
          typography.title,
          {
            color: colors.primary,
            marginTop: spacing.sm,
            textAlign: 'center',
          },
        ]}
      >
        {episode.hebrewTitle}
      </Text>

      <Text
        style={[
          typography.bodySmall,
          {
            marginTop: spacing.sm,
            textAlign: 'center',
            color: colors.muted,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {episode.description}
      </Text>

      <Text
        style={[
          typography.caption,
          {
            marginTop: spacing.md,
            color: colors.text,
            writingDirection: 'ltr',
          },
        ]}
      >
        {formatPodcastDuration(episode.durationSeconds)}
      </Text>

      {publishedLabel ? (
        <Text
          style={[
            typography.caption,
            {
              marginTop: spacing.xs,
              color: colors.muted,
              textAlign: 'center',
            },
          ]}
        >
          פורסם {publishedLabel}
        </Text>
      ) : null}
    </View>
  );
}
