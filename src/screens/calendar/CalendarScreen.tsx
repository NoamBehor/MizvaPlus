import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalendarDayDetailsSheet } from '@/components/calendar/CalendarDayDetailsSheet';
import { CalendarLegend } from '@/components/calendar/CalendarLegend';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { CalendarMonthHeader } from '@/components/calendar/CalendarMonthHeader';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { calendarTheme } from '@/constants/calendarTheme';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { spacing } from '@/constants/theme';
import { useHebrewMonthCalendar } from '@/hooks/useHebrewMonthCalendar';
import { useZmanimLocation } from '@/hooks/useZmanimLocation';
import { formatHebrewDayNumber } from '@/services/calendar/calendarCellPresentation';
import { formatZmanimLocationDisplayLabel } from '@/services/zmanimLocation';
import { parseDateKey } from '@/utils/timezone';

export function CalendarScreen() {
  const fontsLoaded = useHomeFonts();
  const { calendarInput, zmanimLocation } = useZmanimLocation();
  const {
    month,
    selectedDateKey,
    todayDateKey,
    isLoading,
    error,
    selectDate,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  } = useHebrewMonthCalendar(calendarInput);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedCell = month?.cells.find(
    (cell) => cell.dateKey === selectedDateKey,
  );
  const parasha =
    selectedCell?.dayInfo.weeklyParasha ??
    month?.cells.find((cell) => cell.dayInfo.weeklyParasha)?.dayInfo
      .weeklyParasha;
  const locationLabel =
    selectedCell?.dayInfo.locationLabel ??
    (zmanimLocation
      ? formatZmanimLocationDisplayLabel(zmanimLocation.source)
      : undefined);
  const todayHebrewDay = useMemo(() => {
    const todayCell = month?.cells.find(
      (cell) => cell.dateKey === todayDateKey,
    );
    if (todayCell) {
      return formatHebrewDayNumber(todayCell.dayInfo.hebrewDate.day);
    }
    return formatHebrewDayNumber(parseDateKey(todayDateKey).getDate());
  }, [month, todayDateKey]);

  const handleSelectDate = (dateKey: string) => {
    selectDate(dateKey);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => setDetailsOpen(false);

  const handlePreviousMonth = () => {
    setDetailsOpen(false);
    goToPreviousMonth();
  };

  const handleNextMonth = () => {
    setDetailsOpen(false);
    goToNextMonth();
  };

  const handleGoToToday = () => {
    setDetailsOpen(false);
    goToToday();
  };

  return (
    <ScreenContainer backgroundColor={calendarTheme.canvas}>
      <View style={styles.topRow}>
        <View style={styles.contextChip}>
          <Text
            numberOfLines={1}
            style={[
              styles.contextText,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
            ]}
          >
            {[locationLabel, parasha?.hebrewName].filter(Boolean).join(' • ')}
          </Text>
        </View>
        <Pressable
          onPress={handleGoToToday}
          accessibilityRole="button"
          accessibilityLabel="חזרה להיום"
          style={({ pressed }) => [styles.todayChip, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.todayDot} />
          <Text
            style={[
              styles.todayLabel,
              homeFontStyle(fontsLoaded, homeFonts.bold),
            ]}
          >
            {`היום ${todayHebrewDay}`}
          </Text>
        </Pressable>
      </View>

      <CalendarMonthHeader
        month={month}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
      />

      <CalendarLegend />

      {error ? (
        <Text
          style={[
            styles.error,
            homeFontStyle(fontsLoaded, homeFonts.regular),
          ]}
        >
          {error}
        </Text>
      ) : null}

      {isLoading && !month ? (
        <View style={styles.skeleton} testID="calendar-month-skeleton">
          {Array.from({ length: 5 }).map((_, row) => (
            <View key={`sk-${row}`} style={styles.skeletonRow}>
              {Array.from({ length: 7 }).map((__, col) => (
                <View key={`sk-${row}-${col}`} style={styles.skeletonCell} />
              ))}
            </View>
          ))}
        </View>
      ) : month ? (
        <CalendarMonthGrid
          cells={month.cells}
          selectedDateKey={selectedDateKey}
          todayDateKey={todayDateKey}
          onSelectDate={handleSelectDate}
        />
      ) : null}

      <CalendarDayDetailsSheet
        visible={detailsOpen && Boolean(selectedCell)}
        dayInfo={selectedCell?.dayInfo ?? null}
        onClose={handleCloseDetails}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    direction: 'rtl',
  },
  contextChip: {
    flex: 1,
    backgroundColor: '#EAE8E5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contextText: {
    fontSize: 11,
    color: calendarTheme.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  todayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFDF98',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: calendarTheme.today,
  },
  todayLabel: {
    fontSize: 12,
    color: '#251A00',
    writingDirection: 'rtl',
  },
  error: {
    color: calendarTheme.fast.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
  },
  skeleton: {
    backgroundColor: calendarTheme.surface,
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: 4,
  },
  skeletonCell: {
    flex: 1,
    height: 74,
    borderRadius: 8,
    backgroundColor: '#EFEDEB',
  },
});
