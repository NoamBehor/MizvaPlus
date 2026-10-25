import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { calendarTheme } from '@/constants/calendarTheme';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { borderRadius, spacing } from '@/constants/theme';
import type { CalendarHebrewMonth } from '@/types/calendar';

interface CalendarMonthHeaderProps {
  month: CalendarHebrewMonth | null;
  onPrevious: () => void;
  onNext: () => void;
}

export function CalendarMonthHeader({
  month,
  onPrevious,
  onNext,
}: CalendarMonthHeaderProps) {
  const fontsLoaded = useHomeFonts();

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel="חודש הבא"
        style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
      >
        <AppIcon name="chevronRight" size={20} color={calendarTheme.primary} />
      </Pressable>
      <View style={styles.titleBlock}>
        <Text
          style={[
            styles.hebrewTitle,
            homeFontStyle(fontsLoaded, homeFonts.bold),
          ]}
        >
          {month
            ? `${month.hebrewMonthName} ${month.hebrewYearLabel}`
            : 'טוען חודש...'}
        </Text>
        {month ? (
          <Text
            style={[
              styles.gregorian,
              homeFontStyle(fontsLoaded, homeFonts.regular),
            ]}
          >
            {month.gregorianRangeLabel}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onPrevious}
        accessibilityRole="button"
        accessibilityLabel="חודש קודם"
        style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
      >
        <AppIcon name="chevronLeft" size={20} color={calendarTheme.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: calendarTheme.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    direction: 'rtl',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  hebrewTitle: {
    fontSize: 22,
    color: calendarTheme.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  gregorian: {
    marginTop: 2,
    fontSize: 13,
    color: calendarTheme.muted,
    textAlign: 'center',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F5F3F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
