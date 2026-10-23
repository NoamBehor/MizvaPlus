import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeStatCard, homeTheme } from '@/constants/homeTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { CalendarDayInfo, WeeklyParasha } from '@/types/calendar';

interface WeeklyParashaCardProps {
  dayInfo: CalendarDayInfo | null;
  isLoading: boolean;
  calendarError?: string | null;
  isRefreshing?: boolean;
  onOpen?: () => void;
}

function buildAccessibilityLabel(
  parasha: WeeklyParasha | null | undefined,
  showLoading: boolean,
  canOpen: boolean,
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
  const action = canOpen ? ', פתח את פרק הפודקאסט' : '';

  return `פרשת השבוע, ${parasha.hebrewDisplayName}${datePart}${action}`;
}

function WeeklyParashaLoadingContent() {
  return (
    <View style={{ gap: spacing.sm, flex: 1 }}>
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
          height: 22,
          borderRadius: borderRadius.md,
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
  onOpen,
}: WeeklyParashaCardProps) {
  const fontsLoaded = useHomeFonts();
  const parasha = dayInfo?.weeklyParasha;
  const showLoading = isLoading && !parasha;
  const isStaleWhileRevalidating = isRefreshing && Boolean(parasha);
  const accessibilityLabel = buildAccessibilityLabel(parasha, showLoading, Boolean(onOpen));
  const subtitle = [parasha?.gregorianDate, parasha?.hebrewDate]
    .filter(Boolean)
    .join(' • ');

  const body = (
    <View
      style={[
        homeTheme.cardShadow,
        {
          backgroundColor: homeTheme.surface,
          borderRadius: homeTheme.cardRadius,
          borderWidth: 1,
          borderColor: homeStatCard.border,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginBottom: homeTheme.sectionGap,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: homeTheme.goldSoft,
            borderWidth: 1,
            borderColor: homeTheme.goldBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="scroll" size={24} color={homeTheme.goldDeep} />
        </View>
        <View
          style={{ flex: 1 }}
          accessibilityRole={onOpen && parasha ? undefined : 'text'}
          accessibilityLabel={onOpen && parasha ? undefined : accessibilityLabel}
          importantForAccessibility={onOpen && parasha ? 'no-hide-descendants' : 'auto'}
        >
          {showLoading ? (
            <WeeklyParashaLoadingContent />
          ) : !parasha ? (
            <>
              <Text
                style={[
                  typography.caption,
                  homeFontStyle(fontsLoaded, homeFonts.bold),
                  { color: homeTheme.goldDeep },
                ]}
              >
                פרשת השבוע
              </Text>
              <Text style={[typography.bodySmall, { marginTop: 4, color: homeTheme.muted }]}>
                {calendarError ?? 'פרשה לא זמינה כרגע'}
              </Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text
                  style={[
                    typography.caption,
                    homeFontStyle(fontsLoaded, homeFonts.bold),
                    { color: homeTheme.goldDeep },
                  ]}
                >
                  פרשת השבוע
                </Text>
                {isStaleWhileRevalidating ? (
                  <Text style={[typography.caption, { color: homeTheme.muted }]}>מעדכן...</Text>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  typography.subtitle,
                  homeFontStyle(fontsLoaded, homeFonts.bold),
                  { color: homeTheme.text },
                ]}
              >
                {parasha.hebrewDisplayName}
              </Text>
              {subtitle ? (
                <Text numberOfLines={1} style={[typography.caption, { color: homeTheme.muted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>
      {onOpen && parasha ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="chevronLeft" color={homeTheme.muted} />
        </View>
      ) : null}
    </View>
  );

  if (!onOpen || !parasha) {
    return body;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onOpen}
    >
      {body}
    </Pressable>
  );
}
