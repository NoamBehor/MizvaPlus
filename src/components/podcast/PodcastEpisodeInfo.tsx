import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, spacing, surfaces, typography } from '@/constants/theme';
import type { ParashaPodcastEpisode } from '@/types/podcast';
import {
  formatPodcastDuration,
  formatPodcastPublishedDate,
} from '@/utils/podcastFormat';

interface PodcastEpisodeInfoProps {
  episode: ParashaPodcastEpisode;
}

export function PodcastEpisodeInfo({ episode }: PodcastEpisodeInfoProps) {
  const publishedLabel = formatPodcastPublishedDate(episode.publishedAt);

  const rows = [
    { label: 'פרשה', value: episode.hebrewTitle },
    { label: 'אורך', value: formatPodcastDuration(episode.durationSeconds) },
    { label: 'שבוע', value: `עד שבת ${episode.weekEnd}` },
    { label: 'גרסה', value: `פרק ${episode.version}` },
    ...(publishedLabel
      ? [{ label: 'תאריך פרסום', value: publishedLabel }]
      : []),
  ];

  return (
    <View
      style={{
        marginTop: spacing.xl,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        backgroundColor: surfaces.prayerSectionSurface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={typography.subtitle}>על הפרק</Text>
      <Text
        style={[
          typography.bodySmall,
          { marginTop: spacing.xs, color: colors.muted },
        ]}
      >
        נוצר עבור פרשת {episode.hebrewTitle}
      </Text>

      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {rows.map((row) => (
          <View
            key={row.label}
            className="flex-row-reverse items-center justify-between"
          >
            <Text style={[typography.caption, { color: colors.muted }]}>
              {row.label}
            </Text>
            <Text style={typography.label}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
