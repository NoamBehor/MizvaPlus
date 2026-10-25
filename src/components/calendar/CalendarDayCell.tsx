import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { calendarTheme, categoryTokens } from '@/constants/calendarTheme';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { presentCalendarCell } from '@/services/calendar/calendarCellPresentation';
import type { CalendarMonthCell } from '@/types/calendar';

interface CalendarDayCellProps {
  cell: CalendarMonthCell;
  selected: boolean;
  isToday: boolean;
  onPress: (dateKey: string) => void;
}

const TIME_PATTERN = /^\d{1,2}:\d{2}$/;

export function CalendarDayCell({
  cell,
  selected,
  isToday,
  onPress,
}: CalendarDayCellProps) {
  const fontsLoaded = useHomeFonts();
  const presentation = presentCalendarCell(cell.dayInfo);
  const tokens = categoryTokens(presentation.category);
  const dimmed = !cell.inCurrentMonth;
  const timePrimary = TIME_PATTERN.test(presentation.primaryLabel);
  const categorized = presentation.category !== 'none';
  const filled =
    !dimmed &&
    (presentation.category === 'holiday' || presentation.category === 'fast');
  const emphasized = !dimmed && (categorized || selected || isToday);

  const accessibilityLabel = [
    isToday ? 'היום' : null,
    presentation.hebrewDayLabel,
    cell.dayInfo.hebrewDate.monthName,
    `${presentation.gregorianDay}`,
    presentation.primaryLabel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => onPress(cell.dateKey)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      testID={`calendar-day-${cell.dateKey}`}
      style={({ pressed }) => [
        styles.cell,
        {
          borderColor: dimmed
            ? calendarTheme.none.border
            : categorized
              ? tokens.border
              : isToday || selected
                ? calendarTheme.today
                : calendarTheme.none.border,
          borderWidth: emphasized ? 2 : 1,
          backgroundColor: dimmed
            ? calendarTheme.surface
            : filled
              ? tokens.fill
              : calendarTheme.surface,
          opacity: dimmed ? 0.4 : 1,
        },
        pressed && !dimmed ? styles.pressed : null,
      ]}
    >
      <View style={styles.topRow}>
        <Text
          style={[
            styles.hebrewDay,
            homeFontStyle(fontsLoaded, homeFonts.bold),
            { color: dimmed ? calendarTheme.muted : tokens.text },
          ]}
        >
          {presentation.hebrewDayLabel}
        </Text>
        <Text
          style={[
            styles.gregorianDay,
            homeFontStyle(fontsLoaded, homeFonts.regular),
          ]}
        >
          {presentation.gregorianDay}
        </Text>
      </View>
      {presentation.primaryLabel && !timePrimary ? (
        <Text
          numberOfLines={2}
          style={[
            styles.primary,
            homeFontStyle(fontsLoaded, homeFonts.semibold),
            { color: dimmed ? calendarTheme.muted : tokens.text },
          ]}
        >
          {presentation.primaryLabel}
        </Text>
      ) : (
        <View style={styles.spacer} />
      )}
      {timePrimary ? (
        <View style={styles.timeRow}>
          <AppIcon
            name="flame"
            size={10}
            color={dimmed ? calendarTheme.muted : tokens.text}
          />
          <Text
            style={[
              styles.timeLabel,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: dimmed ? calendarTheme.muted : tokens.text },
            ]}
          >
            {presentation.primaryLabel}
          </Text>
        </View>
      ) : presentation.secondaryLabel ? (
        <Text numberOfLines={1} style={styles.secondary}>
          {presentation.secondaryLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    minHeight: 66,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    direction: 'rtl',
  },
  hebrewDay: {
    fontSize: 15,
    writingDirection: 'rtl',
  },
  gregorianDay: {
    fontSize: 11,
    color: calendarTheme.muted,
  },
  primary: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  spacer: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    direction: 'rtl',
  },
  timeLabel: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  secondary: {
    fontSize: 10,
    color: calendarTheme.muted,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
