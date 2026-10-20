import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { homeStatCard } from '@/constants/homeTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { getLevelProgress } from '@/types/gamification';

interface XpCardProps {
  xp: number;
}

export function XpCard({ xp }: XpCardProps) {
  const levelProgress = getLevelProgress(xp);
  const progressWidth =
    levelProgress.xpForNextLevel === null
      ? 100
      : levelProgress.progressPercentage;

  return (
    <View
      className="flex-1"
      style={[
        homeStatCard.shadow,
        {
          backgroundColor: homeStatCard.background,
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
          <Text style={{ fontSize: 22 }} accessibilityLabel="נקודות ניסיון">
            ⭐
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.caption, { color: homeStatCard.mutedText }]}>
            XP
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
            {xp}
          </Text>

          <Text
            style={[
              typography.caption,
              {
                color: homeStatCard.mutedText,
                marginTop: 2,
                textAlign: 'right',
                writingDirection: 'rtl',
              },
            ]}
          >
            רמה {levelProgress.currentLevel}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: spacing.sm,
          height: 6,
          borderRadius: borderRadius.full,
          backgroundColor: homeStatCard.track,
        }}
      >
        <View
          style={{
            width: `${progressWidth}%`,
            height: '100%',
            backgroundColor: colors.accent,
            borderRadius: borderRadius.full,
          }}
        />
      </View>

      {levelProgress.xpForNextLevel !== null ? (
        <Text
          numberOfLines={1}
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
          עוד {levelProgress.xpForNextLevel - xp} לרמה הבאה
        </Text>
      ) : (
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
          רמה מקסימלית
        </Text>
      )}
    </View>
  );
}
