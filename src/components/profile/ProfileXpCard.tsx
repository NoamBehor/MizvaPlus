import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppIcon, type AppIconName } from '@/components/common/AppIcon';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { BADGE_DEFINITIONS } from '@/constants/badges';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { profileTheme } from '@/constants/profileTheme';
import { spacing, typography } from '@/constants/theme';
import type { GamificationStats, LevelProgress } from '@/types/gamification';

interface ProfileXpCardProps {
  stats: GamificationStats;
  levelProgress: LevelProgress;
}

interface MetricTile {
  key: string;
  icon: AppIconName;
  iconColor: string;
  iconBackground: string;
  value: string;
  caption: string;
}

export function ProfileXpCard({ stats, levelProgress }: ProfileXpCardProps) {
  const fontsLoaded = useHomeFonts();
  const nextLevel =
    levelProgress.xpForNextLevel === null ? null : levelProgress.currentLevel + 1;
  const remaining =
    levelProgress.xpForNextLevel === null
      ? null
      : levelProgress.xpForNextLevel - stats.xp;
  const totalBadges = BADGE_DEFINITIONS.length;

  const metrics: MetricTile[] = [
    {
      key: 'streak',
      icon: 'flame',
      iconColor: '#EA580C',
      iconBackground: '#FFEDD5',
      value: formatStreak(stats.streakCount),
      caption: 'התמדה יומית',
    },
    {
      key: 'mitzvot',
      icon: 'check',
      iconColor: '#059669',
      iconBackground: '#D1FAE5',
      value: `${stats.completedMitzvotCount} מצוות`,
      caption: 'בוצעו בסך הכל',
    },
    {
      key: 'quizzes',
      icon: 'trivia',
      iconColor: '#7C3AED',
      iconBackground: '#EDE9FE',
      value: `${stats.correctQuizCount} תשובות`,
      caption: 'נענו בהצלחה בחידון',
    },
    {
      key: 'badges',
      icon: 'star',
      iconColor: '#D97706',
      iconBackground: '#FEF3C7',
      value: `${stats.unlockedBadgeCount} הישגים`,
      caption: `מתוך ${totalBadges} סה״כ`,
    },
  ];

  const summary =
    remaining === null
      ? `רמה ${levelProgress.currentLevel}, ${stats.xp} נקודות, רמה מקסימלית`
      : `רמה ${levelProgress.currentLevel}, ${stats.xp} נקודות, עוד ${remaining} לרמה ${nextLevel}`;

  return (
    <Card elevated style={cardStyle}>
      <View accessibilityRole="summary" accessibilityLabel={summary}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md,
          }}
        >
          <LinearGradient
            colors={[profileTheme.gold, profileTheme.goldLight]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={levelPill}
          >
            <AppIcon name="star" size={14} color={colors.white} />
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.bold),
                { color: colors.white, fontSize: 12 },
              ]}
            >
              רמה {levelProgress.currentLevel}
            </Text>
          </LinearGradient>
          <View style={xpPill}>
            <AppIcon name="star" size={16} color="#F59E0B" />
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.bold),
                { color: homeTheme.text, fontSize: 14 },
              ]}
            >
              {stats.xp} XP
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: spacing.sm,
            marginBottom: spacing.xs,
          }}
        >
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: homeTheme.text, flex: 1 },
            ]}
          >
            {nextLevel === null ? 'רמה מקסימלית' : `התקדמות לרמה ${nextLevel}`}
          </Text>
          {remaining !== null ? (
            <Text style={[typography.caption, { color: homeTheme.muted }]}>
              עוד {remaining} XP לרמה הבאה
            </Text>
          ) : null}
        </View>

        <ProgressBar
          percentage={levelProgress.progressPercentage}
          showPercentageLabel={false}
          fillColor={profileTheme.goldLight}
          height={10}
          accessibilityLabel={
            remaining === null
              ? 'רמה מקסימלית'
              : `${levelProgress.progressPercentage} אחוז בדרך לרמה ${nextLevel}`
          }
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: spacing.xs,
          }}
        >
          <Text style={[typography.caption, { color: homeTheme.muted }]}>
            {levelProgress.progressPercentage}% הושלמו
          </Text>
          {levelProgress.xpForNextLevel !== null ? (
            <Text style={[typography.caption, { color: homeTheme.muted }]}>
              יעד: {levelProgress.xpForNextLevel} XP
            </Text>
          ) : null}
        </View>
      </View>

      <View style={metricGrid}>
        <View style={metricRow}>
          <MetricTileView tile={metrics[0]} fontsLoaded={fontsLoaded} />
          <MetricTileView tile={metrics[1]} fontsLoaded={fontsLoaded} />
        </View>
        <View style={metricRow}>
          <MetricTileView tile={metrics[2]} fontsLoaded={fontsLoaded} />
          <MetricTileView tile={metrics[3]} fontsLoaded={fontsLoaded} />
        </View>
      </View>
    </Card>
  );
}

function MetricTileView({
  tile,
  fontsLoaded,
}: {
  tile: MetricTile;
  fontsLoaded: boolean;
}) {
  return (
    <View
      style={metricTile}
      accessibilityLabel={`${tile.value}, ${tile.caption}`}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: tile.iconBackground,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={tile.icon} size={16} color={tile.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            homeFontStyle(fontsLoaded, homeFonts.bold),
            { color: homeTheme.text, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
          ]}
        >
          {tile.value}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: homeTheme.muted, fontSize: 10, lineHeight: 14 },
          ]}
        >
          {tile.caption}
        </Text>
      </View>
    </View>
  );
}

function formatStreak(count: number): string {
  if (count === 1) {
    return 'יום 1 ברצף';
  }
  return `${count} ימים ברצף`;
}

const cardStyle = {
  backgroundColor: colors.white,
  borderColor: '#F1F5F9',
  borderRadius: homeTheme.cardRadius,
  marginBottom: 0,
};

const levelPill = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
};

const xpPill = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  backgroundColor: '#FFFBEB',
  borderWidth: 1,
  borderColor: '#FDE68A',
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 4,
};

const metricGrid = {
  marginTop: spacing.md,
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
  gap: 8,
};

const metricRow = {
  flexDirection: 'row' as const,
  gap: 8,
};

const metricTile = {
  flex: 1,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#F1F5F9',
  borderRadius: 12,
  padding: 10,
};
