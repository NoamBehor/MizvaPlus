import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { homeStatCard } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';

interface StreakCardProps {
  streakCount: number;
}

export function StreakCard({ streakCount }: StreakCardProps) {
  const isActive = streakCount > 0;

  return (
    <View
      className="flex-1"
      style={[
        homeStatCard.shadow,
        {
          backgroundColor: homeStatCard.backgroundAlt,
          borderRadius: homeStatCard.radius,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: homeStatCard.border,
          minWidth: 0,
        },
      ]}
    >
      <View
        className="flex-row-reverse"
        style={{ alignItems: 'flex-start', gap: spacing.sm }}
      >
        <View
          style={{
            width: 32,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              opacity: isActive ? 1 : 0.45,
            }}
            accessibilityLabel="רצף יומי"
          >
            🔥
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.caption, { color: homeStatCard.mutedText }]}>
            רצף יומי
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[
              typography.subtitle,
              {
                color: colors.primary,
                marginTop: spacing.xs,
                textAlign: 'right',
                writingDirection: 'rtl',
                flexShrink: 0,
              },
            ]}
          >
            {streakCount}
          </Text>

          <Text
            style={[
              typography.caption,
              {
                color: homeStatCard.mutedText,
                marginTop: spacing.xs,
                textAlign: 'right',
                writingDirection: 'rtl',
              },
            ]}
          >
            {streakCount === 1 ? 'יום' : 'ימים'}
          </Text>
        </View>
      </View>
    </View>
  );
}
