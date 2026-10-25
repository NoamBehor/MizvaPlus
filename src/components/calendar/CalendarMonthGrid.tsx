import { StyleSheet, Text, View } from 'react-native';

import { CalendarDayCell } from '@/components/calendar/CalendarDayCell';
import { calendarTheme, WEEKDAY_LABELS } from '@/constants/calendarTheme';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import type { CalendarMonthCell } from '@/types/calendar';

interface CalendarMonthGridProps {
  cells: CalendarMonthCell[];
  selectedDateKey: string;
  todayDateKey: string;
  onSelectDate: (dateKey: string) => void;
}

function chunkWeeks(cells: CalendarMonthCell[]): CalendarMonthCell[][] {
  const weeks: CalendarMonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function CalendarMonthGrid({
  cells,
  selectedDateKey,
  todayDateKey,
  onSelectDate,
}: CalendarMonthGridProps) {
  const fontsLoaded = useHomeFonts();
  const weeks = chunkWeeks(cells);

  return (
    <View style={styles.card} testID="calendar-month-grid">
      <View style={styles.weekdays}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text
            key={label}
            style={[
              styles.weekday,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              index === 5 ? { color: calendarTheme.erev.text } : null,
              index === 6 ? { color: calendarTheme.shabbat.text } : null,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.dateKey ?? 'week'} style={styles.week}>
          {week.map((cell) => (
            <View key={cell.dateKey} style={styles.cellWrap}>
              <CalendarDayCell
                cell={cell}
                selected={cell.dateKey === selectedDateKey}
                isToday={cell.dateKey === todayDateKey}
                onPress={onSelectDate}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: calendarTheme.surface,
    borderRadius: 16,
    padding: 8,
    gap: 4,
  },
  weekdays: {
    flexDirection: 'row',
    direction: 'rtl',
    marginBottom: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: calendarTheme.muted,
    writingDirection: 'rtl',
    paddingVertical: 4,
  },
  week: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: 4,
  },
  cellWrap: {
    flex: 1,
  },
});
