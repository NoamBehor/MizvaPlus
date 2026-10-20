import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { homeStatCard } from '@/constants/homeTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { CalendarDayInfo, WeeklyParasha } from '@/types/calendar';

interface WeeklyParashaCardProps {
  dayInfo: CalendarDayInfo | null;
  isLoading: boolean;
  calendarError?: string | null;
  isRefreshing?: boolean;
}

function buildAccessibilityLabel(
  parasha: WeeklyParasha | null | undefined,
  showLoading: boolean,
): string {
  if (showLoading) {
    return 'פרשת השבוע, טוען';
  }

  if (!parasha) {
    return 'פרשת השבוע, לא זמינה כרגע';
  }

  const datePart = parasha.gregorianDate
    ? `, ${parasha.gregorianDate}${parasha.hebrewDate ? `, ${parasha.hebrewDate}` : ''}`
    : '';

  return `פרשת השבוע, ${parasha.hebrewDisplayName}${datePart}`;
}

function WeeklyParashaLoadingContent() {
  return (
    <View style={{ gap: spacing.sm, alignItems: 'flex-end', width: '100%' }}>
      <View
        style={{
          width: 88,
          height: 12,
          borderRadius: borderRadius.sm,
          backgroundColor: homeStatCard.track,
        }}
      />
      <View
        style={{
          width: '65%',
          height: 32,
          borderRadius: borderRadius.md,
          backgroundColor: homeStatCard.track,
        }}
      />
      <View
        style={{
          width: '45%',
          height: 14,
          borderRadius: borderRadius.sm,
          backgroundColor: homeStatCard.track,
        }}
      />
    </View>
  );
}

export function WeeklyParashaCard({
  dayInfo,
  isLoading,
  calendarError = null,
  isRefreshing = false,
}: WeeklyParashaCardProps) {
  const parasha = dayInfo?.weeklyParasha;
  const showLoading = isLoading && !parasha;
  const isStaleWhileRevalidating = isRefreshing && Boolean(parasha);
  const accessibilityLabel = buildAccessibilityLabel(parasha, showLoading);

  return (
    <Card
      className="mb-5"
      elevated
      style={{
        borderWidth: 1,
        borderColor: homeStatCard.border,
        ...homeStatCard.shadow,
      }}
    >
      <View
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        style={{
          backgroundColor: homeStatCard.background,
          borderRadius: homeStatCard.radius,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.md,
          alignItems: 'flex-end',
        }}
      >
        {showLoading ? (
          <WeeklyParashaLoadingContent />
        ) : !parasha ? (
          <>
            <Text style={[typography.label, { color: colors.muted }]}>
              פרשת השבוע
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { marginTop: spacing.sm, color: colors.muted },
              ]}
            >
              {calendarError ?? 'פרשה לא זמינה כרגע'}
            </Text>
          </>
        ) : (
          <>
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={[typography.label, { color: colors.muted }]}>
                פרשת השבוע
              </Text>
              {isStaleWhileRevalidating ? (
                <Text style={[typography.caption, { color: colors.muted }]}>
                  מעדכן...
                </Text>
              ) : null}
            </View>

            <Text
              style={{
                fontSize: 30,
                fontWeight: '700',
                color: colors.primary,
                textAlign: 'right',
                writingDirection: 'rtl',
                marginTop: spacing.sm,
                lineHeight: 36,
              }}
            >
              {parasha.hebrewDisplayName}
            </Text>

            {parasha.gregorianDate ? (
              <Text
                style={[
                  typography.bodySmall,
                  { marginTop: spacing.xs, color: colors.muted },
                ]}
              >
                {parasha.gregorianDate}
                {parasha.hebrewDate ? ` · ${parasha.hebrewDate}` : ''}
              </Text>
            ) : null}
          </>
        )}
      </View>

      {dayInfo?.locationSource === 'fallback' && !showLoading ? (
        <Text
          style={[
            typography.caption,
            { marginTop: spacing.sm, color: colors.muted },
          ]}
        >
          זמנים מחושבים ל{dayInfo.locationLabel}
        </Text>
      ) : null}
    </Card>
  );
}
