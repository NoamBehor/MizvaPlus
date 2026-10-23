import { Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeStatCard, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import type { MitzvahCompletion } from '@/types/mitzvah';
import { addDaysToDateKey, getActivityDateKey, parseDateKey } from '@/utils/timezone';

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'] as const;

interface StreakCardProps {
  streakCount: number;
  userId: string;
  completions: MitzvahCompletion[];
}

function weekdayActivity(userId: string, completions: MitzvahCompletion[]): boolean[] {
  const todayKey = getActivityDateKey();
  const sundayKey = addDaysToDateKey(todayKey, -parseDateKey(todayKey).getDay());

  return WEEKDAY_LABELS.map((_, index) => {
    const dateKey = addDaysToDateKey(sundayKey, index);
    return completions.some(
      (completion) =>
        completion.userId === userId && completion.completionDate === dateKey,
    );
  });
}

export function StreakCard({ streakCount, userId, completions }: StreakCardProps) {
  const fontsLoaded = useHomeFonts();
  const days = weekdayActivity(userId, completions);
  const isActive = streakCount > 0;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`רצף יומי, ${streakCount} ימים`}
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
          רצף יומי
        </Text>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: '#FFF7ED',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="flame" size={16} color="#F97316" />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.sm,
          gap: spacing.xs,
        }}
      >
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
          {streakCount}
        </Text>
        <Text
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.semibold),
            {
              color: isActive ? '#C2410C' : homeTheme.muted,
              backgroundColor: isActive ? '#FFEDD5' : homeStatCard.track,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
            },
          ]}
        >
          {isActive ? 'ימים ברצף!' : 'ימים'}
        </Text>
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: spacing.sm,
        }}
      >
        {WEEKDAY_LABELS.map((label, index) => {
          const filled = days[index];
          return (
            <View
              key={label}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: filled ? '#F97316' : '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 8, color: filled ? '#FFFFFF' : homeTheme.muted, fontWeight: '700' }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
