import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CALENDAR_LEGEND, calendarTheme } from '@/constants/calendarTheme';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { spacing } from '@/constants/theme';

export function CalendarLegend() {
  const fontsLoaded = useHomeFonts();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
    >
      {CALENDAR_LEGEND.map((item) => (
        <View key={item.id} style={[styles.chip, { borderColor: `${item.color}66` }]}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text
            style={[
              styles.label,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    direction: 'rtl',
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: calendarTheme.surface,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    color: calendarTheme.text,
    writingDirection: 'rtl',
  },
});
