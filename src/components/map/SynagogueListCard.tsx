import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { Synagogue } from '@/types/synagogue';
import { formatDistanceMeters } from '@/utils/distance';

interface SynagogueListCardProps {
  synagogue: Synagogue;
  selected: boolean;
  onPress: (synagogue: Synagogue) => void;
}

export function SynagogueListCard({
  synagogue,
  selected,
  onPress,
}: SynagogueListCardProps) {
  const distanceLabel =
    typeof synagogue.distanceMeters === 'number'
      ? formatDistanceMeters(synagogue.distanceMeters)
      : null;

  const prayerSummary =
    synagogue.prayerTimes && synagogue.prayerTimes.length > 0
      ? synagogue.prayerTimes
          .slice(0, 3)
          .map((time) => `${time.name} ${time.time}`)
          .join(' · ')
      : null;

  return (
    <Pressable onPress={() => onPress(synagogue)} accessibilityRole="button">
      <Card
        className="mb-3"
        style={
          selected
            ? {
                borderColor: colors.accent,
                borderWidth: 2,
                backgroundColor: colors.surface,
              }
            : undefined
        }
      >
        <View className="gap-1">
          <Text style={typography.subtitle}>{synagogue.name}</Text>
          <Text style={typography.bodySmall}>{synagogue.address}</Text>

          <View className="mt-1 flex-row-reverse flex-wrap items-center gap-2">
            {distanceLabel ? (
              <Text style={[typography.label, { color: colors.accent }]}>
                {distanceLabel}
              </Text>
            ) : null}

            {synagogue.denomination ? (
              <Text style={typography.caption}>{synagogue.denomination}</Text>
            ) : null}

            {synagogue.hasMinyan ? (
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.success,
                    fontWeight: '600',
                  },
                ]}
              >
                יש מניין
              </Text>
            ) : null}
          </View>

          {prayerSummary ? (
            <Text style={[typography.caption, { marginTop: 4 }]}>
              {prayerSummary}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
