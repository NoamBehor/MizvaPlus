import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { calendarTheme, dayTagTokens } from '@/constants/calendarTheme';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { spacing } from '@/constants/theme';
import {
  EVENT_KEY_TO_HOLIDAY_KEY,
} from '@/constants/eventDescriptors';
import { presentCalendarDayDetails } from '@/services/calendar/calendarCellPresentation';
import { filterEnabledActiveMitzvotForToday } from '@/services/calendarMitzvot';
import { getHolidayGuide } from '@/services/holidayGuideService';
import { navigateToMitzvahDetail } from '@/navigation/navigationRef';
import { useMitzvahStore } from '@/store/mitzvahStore';
import type { CalendarDayInfo } from '@/types/calendar';
import { normalizeEventKey } from '@/constants/calendarMitzvahMap';

interface CalendarDayDetailsProps {
  dayInfo: CalendarDayInfo;
  onNavigate?: () => void;
}

function closingTitle(caption: string): string {
  if (caption === 'צאת החג') {
    return 'צאת החג / כוכבים';
  }
  if (caption === 'צאת שבת') {
    return 'צאת שבת / כוכבים';
  }
  if (caption === 'צאת הצום') {
    return 'צאת הצום';
  }
  return 'צאת הכוכבים';
}

export function CalendarDayDetails({
  dayInfo,
  onNavigate,
}: CalendarDayDetailsProps) {
  const fontsLoaded = useHomeFonts();
  const mitzvot = useMitzvahStore((state) => state.mitzvot);
  const preferences = useMitzvahStore((state) => state.preferences);
  const details = presentCalendarDayDetails(dayInfo);
  const tagColors = dayTagTokens(details.tag);
  const activeMitzvot = filterEnabledActiveMitzvotForToday(
    mitzvot,
    dayInfo,
    preferences,
  );
  const featuredMitzvot = activeMitzvot.filter(
    (mitzvah) => mitzvah.category !== 'daily',
  );
  const listedMitzvot =
    featuredMitzvot.length > 0 ? featuredMitzvot : activeMitzvot;
  const reminderMitzvot = activeMitzvot.filter(
    (mitzvah) => preferences[mitzvah.id]?.reminderEnabled,
  );
  const holidayKey =
    details.holidayKey && details.holidayKey !== 'other'
      ? details.holidayKey
      : dayInfo.events
          .map((event) =>
            event.eventKey
              ? EVENT_KEY_TO_HOLIDAY_KEY[normalizeEventKey(event.eventKey)]
              : undefined,
          )
          .find(Boolean);
  const guide = holidayKey ? getHolidayGuide(holidayKey) : null;
  const parasha = dayInfo.weeklyParasha;
  const mitzvahLine = listedMitzvot.map((mitzvah) => mitzvah.title).join(', ');
  const reminderNote =
    reminderMitzvot.length > 0
      ? reminderMitzvot
          .map((mitzvah) => {
            const time = preferences[mitzvah.id]?.reminderTime;
            return time ? `${mitzvah.title} ${time}` : mitzvah.title;
          })
          .join(', ')
      : null;
  const noteText = guide?.shortDescription ?? reminderNote;

  const openMitzvah = (mitzvahId: string) => {
    onNavigate?.();
    navigateToMitzvahDetail(mitzvahId);
  };

  return (
    <View style={styles.card} testID="calendar-day-details">
      <View style={styles.chips}>
        <View style={[styles.tag, { backgroundColor: tagColors.background }]}>
          <Text
            style={[
              styles.tagLabel,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { color: tagColors.color },
            ]}
          >
            {details.tag}
          </Text>
        </View>
        {details.omerCount > 0 ? (
          <View style={styles.omerChip}>
            <Text
              style={[
                styles.omerLabel,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
              ]}
            >
              {`ספירת העומר: ${details.omerCount}`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[styles.title, homeFontStyle(fontsLoaded, homeFonts.bold)]}
      >
        {details.title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          homeFontStyle(fontsLoaded, homeFonts.regular),
        ]}
      >
        {details.subtitle}
      </Text>

      <View style={styles.timesRow}>
        <View style={styles.timeCard}>
          <View style={styles.timeTop}>
            <View style={styles.timeHeading}>
              <AppIcon name="flame" size={16} color={calendarTheme.today} />
              <Text
                style={[
                  styles.timeLabel,
                  homeFontStyle(fontsLoaded, homeFonts.bold),
                ]}
              >
                הדלקת נרות
              </Text>
            </View>
            <Text
              style={[
                styles.timeValue,
                homeFontStyle(fontsLoaded, homeFonts.bold),
              ]}
            >
              {details.candleTime ?? '—'}
            </Text>
          </View>
          <Text style={styles.timeCaption}>
            {details.candleTime
              ? details.candleCaption
              : details.locationLabel}
          </Text>
        </View>
        <View style={styles.timeCard}>
          <View style={styles.timeTop}>
            <View style={styles.timeHeading}>
              <AppIcon name="moon" size={16} color={calendarTheme.primary} />
              <Text
                style={[
                  styles.timeLabel,
                  styles.closingLabel,
                  homeFontStyle(fontsLoaded, homeFonts.bold),
                ]}
              >
                {closingTitle(details.closingCaption)}
              </Text>
            </View>
            <Text
              style={[
                styles.timeValue,
                homeFontStyle(fontsLoaded, homeFonts.bold),
              ]}
            >
              {details.closingTime ?? '—'}
            </Text>
          </View>
          <Text style={styles.timeCaption}>{details.locationLabel}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <AppIcon name="scroll" size={20} color={calendarTheme.today} />
        <View style={styles.infoText}>
          <Text
            style={[
              styles.infoTitle,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
            ]}
          >
            קריאת התורה וההפטרה
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.infoMeta,
              homeFontStyle(fontsLoaded, homeFonts.regular),
            ]}
          >
            {parasha?.hebrewName ?? 'קריאת היום כסדרה'}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() =>
          listedMitzvot[0] ? openMitzvah(listedMitzvot[0].id) : undefined
        }
        disabled={listedMitzvot.length === 0}
        accessibilityRole={listedMitzvot.length > 0 ? 'button' : undefined}
        accessibilityLabel="מצוות היום המרכזיות"
        style={styles.infoRow}
      >
        <AppIcon name="check" size={20} color={calendarTheme.today} />
        <View style={styles.infoText}>
          <Text
            style={[
              styles.infoTitle,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
            ]}
          >
            מצוות היום המרכזיות
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.infoMeta,
              homeFontStyle(fontsLoaded, homeFonts.regular),
            ]}
          >
            {mitzvahLine || 'תפילות היום ולימוד תורה'}
          </Text>
        </View>
      </Pressable>

      {noteText ? (
        <View style={styles.note}>
          <AppIcon name="info" size={18} color={calendarTheme.today} />
          <Text
            style={[
              styles.noteText,
              homeFontStyle(fontsLoaded, homeFonts.regular),
            ]}
          >
            <Text
              style={homeFontStyle(fontsLoaded, homeFonts.bold)}
            >
              תזכורת:{' '}
            </Text>
            {noteText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    direction: 'rtl',
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagLabel: {
    fontSize: 12,
    writingDirection: 'rtl',
  },
  omerChip: {
    backgroundColor: calendarTheme.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  omerLabel: {
    color: '#F8FAFC',
    fontSize: 12,
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 20,
    color: calendarTheme.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    marginTop: -4,
    fontSize: 13,
    color: calendarTheme.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  timesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    direction: 'rtl',
  },
  timeCard: {
    flex: 1,
    backgroundColor: calendarTheme.row,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  timeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    direction: 'rtl',
    gap: 8,
  },
  timeHeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    direction: 'rtl',
  },
  timeLabel: {
    flexShrink: 1,
    fontSize: 13,
    color: calendarTheme.today,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  closingLabel: {
    color: calendarTheme.primary,
  },
  timeValue: {
    fontSize: 22,
    color: calendarTheme.primary,
    fontVariant: ['tabular-nums'],
  },
  timeCaption: {
    fontSize: 11,
    color: calendarTheme.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    direction: 'rtl',
    backgroundColor: calendarTheme.row,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  infoTitle: {
    fontSize: 14,
    color: calendarTheme.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  infoMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: calendarTheme.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    direction: 'rtl',
    backgroundColor: calendarTheme.note,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: calendarTheme.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
