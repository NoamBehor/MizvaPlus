import { Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeStatCard, homeTheme } from '@/constants/homeTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { getLevelProgress } from '@/types/gamification';

interface XpCardProps {
  xp: number;
}

export function XpCard({ xp }: XpCardProps) {
  const fontsLoaded = useHomeFonts();
  const levelProgress = getLevelProgress(xp);
  const progressWidth =
    levelProgress.xpForNextLevel === null ? 100 : levelProgress.progressPercentage;
  const remaining =
    levelProgress.xpForNextLevel === null
      ? null
      : levelProgress.xpForNextLevel - xp;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={
        remaining === null
          ? `רמה ${levelProgress.currentLevel}, ${xp} נקודות, רמה מקסימלית`
          : `רמה ${levelProgress.currentLevel}, ${xp} נקודות, עוד ${remaining} לרמה הבאה`
      }
      style={[
        homeStatCard.shadow,
        {
          flex: 1,
          backgroundColor: homeTheme.surface,
          borderRadius: homeTheme.cardRadius,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: homeStatCard.border,
          minWidth: 0,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.bold),
            { color: homeTheme.muted },
          ]}
        >
          רמה {levelProgress.currentLevel}
        </Text>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: homeTheme.goldSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="star" size={16} color="#F59E0B" />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.sm }}>
        <Text
          style={[
            homeFontStyle(fontsLoaded, homeFonts.extrabold),
            {
              fontSize: 28,
              lineHeight: 32,
              color: homeTheme.text,
              fontVariant: ['tabular-nums'],
            },
          ]}
        >
          {xp}
        </Text>
        <Text style={[typography.caption, { color: homeTheme.muted }]}>XP</Text>
      </View>

      <View
        style={{
          marginTop: spacing.sm,
          height: 8,
          borderRadius: borderRadius.full,
          backgroundColor: homeStatCard.track,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${progressWidth}%`,
            height: '100%',
            backgroundColor: '#F59E0B',
            borderRadius: borderRadius.full,
          }}
        />
      </View>

      <Text
        numberOfLines={1}
        style={[typography.caption, { color: homeTheme.muted, marginTop: spacing.xs }]}
      >
        {remaining === null ? 'רמה מקסימלית' : `עוד ${remaining} XP לרמה הבאה`}
      </Text>
    </View>
  );
}
