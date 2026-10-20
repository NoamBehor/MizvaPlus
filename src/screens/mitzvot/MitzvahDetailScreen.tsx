import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ReminderTimePicker } from '@/components/common/ReminderTimePicker';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { ToggleRow } from '@/components/common/ToggleRow';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import {
  navigateToHomeHolidayGuide,
} from '@/navigation/navigationRef';
import { calendarService } from '@/services/calendar';
import { getMitzvahById } from '@/services/mitzvot';
import { getHolidayGuide } from '@/services/holidayGuideService';
import { resolveMitzvahFastContext } from '@/services/mitzvahFastContext';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import {
  getHolidayKeyForMitzvahId,
  getMitzvahCategoryLabel,
  getMitzvahContentText,
  getMitzvahExplanation,
  getMitzvahIcon,
} from '@/utils/mitzvah';
import {
  canOpenPrayerReader,
  getAvailableNusachim,
  getPrayerCatalogItemForMitzvah,
  getPrayerIdForMitzvah,
} from '@/services/texts/prayerContentService';
import {
  canOpenRitualGuide,
  getAvailableRitualGuideNusachim,
  getRitualGuideCatalogItemForMitzvah,
  getRitualGuideIdForMitzvah,
} from '@/services/texts/ritualContentService';
import { getPreferredNusach } from '@/services/texts/prayerReaderPreferences';
import { formatReminderTimeForDisplay } from '@/utils/reminderTimezone';
import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import { useUserLocation } from '@/hooks/useUserLocation';
import { isCalendarMitzvahActiveToday } from '@/services/calendarMitzvot';
import type { HebrewCalendarEvent } from '@/types/calendar';
import { FAST_MITZVAH_IDS } from '@/constants/calendarMitzvahMap';

type MitzvahDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MitzvahDetail'
>;

export function MitzvahDetailScreen({
  navigation,
  route,
}: MitzvahDetailScreenProps) {
  const { mitzvahId } = route.params;
  const mitzvah = getMitzvahById(mitzvahId);

  const user = useUserStore((state) => state.user);
  const preference = useMitzvahStore((state) => state.preferences[mitzvahId]);
  const isCompletedToday = useMitzvahStore((state) => state.isCompletedToday);
  const markMitzvahComplete = useMitzvahStore(
    (state) => state.markMitzvahComplete,
  );
  const setReminder = useMitzvahStore((state) => state.setReminder);
  const setReminderTime = useMitzvahStore((state) => state.setReminderTime);
  const permissionDeniedMessage = useMitzvahStore(
    (state) => state.permissionDeniedMessage,
  );
  const clearPermissionMessage = useMitzvahStore(
    (state) => state.clearPermissionMessage,
  );
  const { location } = useUserLocation();
  const locationInput = location
    ? {
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
      }
    : undefined;
  const { dayInfo } = useHebrewCalendar(locationInput);

  const [showReminderConfig, setShowReminderConfig] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState<string | null>(
    null,
  );
  const [isCompleting, setIsCompleting] = useState(false);
  const [preferredNusach, setPreferredNusachState] = useState<
    'edot_hamizrach' | 'ashkenaz' | 'sefard'
  >('edot_hamizrach');
  const [calendarEvents, setCalendarEvents] = useState<HebrewCalendarEvent[]>(
    [],
  );

  const completed =
    user ? isCompletedToday(user.id, mitzvahId) : false;

  useEffect(() => {
    void getPreferredNusach().then(setPreferredNusachState);
  }, []);

  useEffect(() => {
    void calendarService.getUpcomingEvents(45, locationInput).then(setCalendarEvents);
  }, [locationInput?.latitude, locationInput?.longitude]);

  const fastContext = useMemo(
    () =>
      mitzvah && FAST_MITZVAH_IDS.has(mitzvah.id)
        ? resolveMitzvahFastContext(mitzvah.id, calendarEvents)
        : null,
    [calendarEvents, mitzvah],
  );

  const handleComplete = async () => {
    if (!user || completed || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setCompletionFeedback(null);

    try {
      await markMitzvahComplete(user.id, mitzvahId);

      if (isCompletedToday(user.id, mitzvahId)) {
        setCompletionFeedback('✓ המצווה הושלמה');
      }
    } finally {
      setIsCompleting(false);
    }
  };

  if (!mitzvah || !user) {
    return (
      <ScreenContainer>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          className="mb-4"
          style={{ minHeight: 48, alignItems: 'flex-end' }}
        >
          <Text style={typography.label}>← חזרה</Text>
        </Pressable>
        <Text style={typography.body}>המצווה לא נמצאה.</Text>
      </ScreenContainer>
    );
  }

  const icon = getMitzvahIcon(mitzvah.id, mitzvah.category);
  const categoryLabel = getMitzvahCategoryLabel(mitzvah.category);
  const explanation = getMitzvahExplanation(mitzvah);
  const fullContent = getMitzvahContentText(mitzvah);
  const showDetailedContent =
    fullContent.trim().length > 0 && fullContent.trim() !== explanation.trim();
  const holidayKey = getHolidayKeyForMitzvahId(mitzvah.id);
  const holidayGuide = holidayKey ? getHolidayGuide(holidayKey) : null;
  const holidayLinkLabel = holidayGuide
    ? `למידע המלא על ${holidayGuide.titleHebrew}`
    : null;
  const holidayContextLabel = holidayGuide
    ? mitzvah.category === 'fast'
      ? `קשור למדריך ${holidayGuide.titleHebrew}`
      : `חלק ממערכת מצוות ${holidayGuide.titleHebrew}`
    : null;
  const prayerCatalogItem = getPrayerCatalogItemForMitzvah(mitzvah.id);
  const localPrayerId = getPrayerIdForMitzvah(mitzvah.id);
  const localRitualGuideId = getRitualGuideIdForMitzvah(mitzvah.id);
  const ritualGuideCatalogItem = getRitualGuideCatalogItemForMitzvah(mitzvah.id);
  const canOpenReader = localPrayerId ? canOpenPrayerReader(localPrayerId) : false;
  const canOpenGuide = localRitualGuideId
    ? canOpenRitualGuide(localRitualGuideId)
    : false;
  const isPartialPrayer = prayerCatalogItem?.availability === 'partial';
  const isPendingPrayer = prayerCatalogItem?.availability === 'pending';
  const readerCtaLabel = isPartialPrayer
    ? 'פתח את סדר התפילה'
    : 'פתח את סדר התפילה המלא';
  const ritualGuideCtaLabel = 'פתח סדר הנחת תפילין וברכות';
  const readerNusach =
    localPrayerId && getAvailableNusachim(localPrayerId).includes(preferredNusach)
      ? preferredNusach
      : localPrayerId
        ? getAvailableNusachim(localPrayerId)[0] ?? 'edot_hamizrach'
        : 'edot_hamizrach';
  const ritualGuideNusach =
    localRitualGuideId &&
    getAvailableRitualGuideNusachim(localRitualGuideId).includes(preferredNusach)
      ? preferredNusach
      : localRitualGuideId
        ? getAvailableRitualGuideNusachim(localRitualGuideId)[0] ??
          'edot_hamizrach'
        : 'edot_hamizrach';
  const isActiveToday = dayInfo
    ? isCalendarMitzvahActiveToday(mitzvah, dayInfo)
    : mitzvah.category === 'daily';

  const reminderEnabled = preference?.reminderEnabled ?? false;
  const reminderTime = preference?.reminderTime;

  return (
    <ScreenContainer>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="חזרה"
        className="mb-4"
        style={{ minHeight: 48, alignItems: 'flex-end' }}
      >
        <Text style={typography.label}>← חזרה</Text>
      </Pressable>

      <View className="mb-4 items-end">
        <View
          className="mb-3 rounded-full px-3 py-1"
          style={{ backgroundColor: colors.border }}
        >
          <Text style={typography.caption}>{categoryLabel}</Text>
        </View>

        <View className="flex-row-reverse items-center gap-3">
          <Text style={{ fontSize: 36 }} accessibilityElementsHidden>
            {icon}
          </Text>
          <Text style={[typography.hero, { flex: 1 }]}>{mitzvah.title}</Text>
        </View>

        <Text style={[typography.bodySmall, { marginTop: 8 }]}>
          {mitzvah.description}
        </Text>
        {dayInfo && mitzvah.category !== 'daily' ? (
          <Text
            style={[
              typography.caption,
              { marginTop: 8, color: isActiveToday ? colors.success : colors.accent },
            ]}
          >
            {isActiveToday
              ? `פעיל היום · ${dayInfo.hebrewDate.displayString}`
              : `לא פעיל היום · ${dayInfo.hebrewDate.displayString}`}
          </Text>
        ) : null}
      </View>

      <View
        className="mb-6"
        style={{ height: 1, backgroundColor: colors.border }}
      />

      <View className="mb-6">
        <Text style={[typography.subtitle, { marginBottom: spacing.md }]}>
          מהי המצווה?
        </Text>
        <Text style={[typography.body, { lineHeight: 26 }]}>{explanation}</Text>
      </View>

      {showDetailedContent ? (
        <View className="mb-6">
          <Text style={[typography.subtitle, { marginBottom: spacing.md }]}>
            הסבר מפורט
          </Text>
          <Text style={[typography.body, { lineHeight: 26 }]}>{fullContent}</Text>
        </View>
      ) : null}

      {fastContext ? (
        <View
          className="mb-6 rounded-2xl p-4"
          style={{ backgroundColor: '#F4F1EA' }}
        >
          <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>
            {fastContext.isActive ? 'הצום הפעיל' : 'הצום הקרוב'}
          </Text>
          <Text style={[typography.bodySmall, { marginBottom: spacing.xs }]}>
            {fastContext.titleHebrew}
          </Text>
          {fastContext.beginTime ? (
            <Text style={[typography.body, { marginTop: spacing.xs }]}>
              תחילת הצום: {fastContext.beginTime}
            </Text>
          ) : null}
          {fastContext.endTime ? (
            <Text style={[typography.body, { marginTop: spacing.xs }]}>
              סיום הצום: {fastContext.endTime}
            </Text>
          ) : null}
          {holidayGuide && holidayKey ? (
            <Pressable
              onPress={() => navigateToHomeHolidayGuide(holidayKey)}
              accessibilityRole="button"
              accessibilityLabel="מידע על הצום"
              style={{
                marginTop: spacing.md,
                alignSelf: 'flex-end',
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text style={[typography.label, { color: colors.secondary }]}>
                מידע על הצום ←
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {holidayGuide && holidayKey && holidayContextLabel && !fastContext ? (
        <View
          className="mb-6 rounded-2xl p-4"
          style={{ backgroundColor: '#F4F1EA' }}
        >
          <Text style={[typography.bodySmall, { marginBottom: spacing.sm }]}>
            {holidayContextLabel}
          </Text>
          {holidayLinkLabel ? (
            <Pressable
              onPress={() => navigateToHomeHolidayGuide(holidayKey)}
              accessibilityRole="button"
              accessibilityLabel={holidayLinkLabel}
              style={{
                alignSelf: 'flex-end',
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text style={[typography.label, { color: colors.secondary }]}>
                {holidayLinkLabel} ←
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {canOpenGuide && localRitualGuideId ? (
        <View className="mb-6">
          <Pressable
            onPress={() =>
              navigation.navigate('PrayerReader', {
                ritualGuideId: localRitualGuideId,
                nusach: ritualGuideNusach,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={ritualGuideCtaLabel}
            className="items-center rounded-2xl py-4"
            style={{
              backgroundColor: colors.secondary,
              minHeight: 52,
            }}
          >
            <Text style={[typography.subtitle, { color: colors.white }]}>
              {ritualGuideCtaLabel}
            </Text>
          </Pressable>
          {ritualGuideCatalogItem ? (
            <Text
              style={[
                typography.caption,
                { marginTop: spacing.sm, textAlign: 'center', color: colors.muted },
              ]}
            >
              {ritualGuideCatalogItem.title}
            </Text>
          ) : null}
        </View>
      ) : null}

      {canOpenReader && localPrayerId ? (
        <View className="mb-6">
          {isPartialPrayer ? (
            <Text
              style={[
                typography.caption,
                {
                  marginBottom: spacing.sm,
                  textAlign: 'center',
                  color: colors.accent,
                },
              ]}
            >
              תוכן חלקי
            </Text>
          ) : null}
          <Pressable
            onPress={() =>
              navigation.navigate('PrayerReader', {
                prayerId: localPrayerId,
                nusach: readerNusach,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={readerCtaLabel}
            className="items-center rounded-2xl py-4"
            style={{
              backgroundColor: colors.secondary,
              minHeight: 52,
            }}
          >
            <Text style={[typography.subtitle, { color: colors.white }]}>
              {readerCtaLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isPendingPrayer ? (
        <View className="mb-6">
          <Text
            style={[
              typography.bodySmall,
              { textAlign: 'center', color: colors.accent },
            ]}
          >
            סדר התפילה המלא יהיה זמין לאחר הוספת תוכן מאומת.
          </Text>
        </View>
      ) : null}

      <View
        className="mb-6"
        style={{ height: 1, backgroundColor: colors.border }}
      />

      <View className="mb-6">
        <Text style={[typography.subtitle, { marginBottom: 8 }]}>
          🔔 תזכורת
        </Text>

        {reminderEnabled && reminderTime ? (
          <Text style={[typography.body, { color: colors.accent }]}>
            {formatReminderTimeForDisplay(reminderTime)}
          </Text>
        ) : (
          <Text style={typography.bodySmall}>🔔 תזכורת כבויה</Text>
        )}

        <Pressable
          onPress={() => setShowReminderConfig((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="הגדר תזכורת"
          className="mt-3 rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.border,
            minHeight: 48,
            alignItems: 'center',
          }}
        >
          <Text style={typography.label}>הגדר תזכורת</Text>
        </Pressable>

        {showReminderConfig && preference ? (
          <View className="mt-4 rounded-xl border border-border p-3">
            <ToggleRow
              label="תזכורת"
              value={preference.reminderEnabled}
              onValueChange={(enabled) => {
                clearPermissionMessage();
                void setReminder(mitzvahId, enabled);
              }}
              disabled={!preference.enabled}
            />

            {permissionDeniedMessage ? (
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.error, marginTop: 8, textAlign: 'center' },
                ]}
              >
                {permissionDeniedMessage}
              </Text>
            ) : null}

            {preference.reminderEnabled ? (
              <View className="mt-3">
                <Text style={[typography.caption, { marginBottom: 8 }]}>
                  שעת תזכורת
                </Text>
                <ReminderTimePicker
                  value={
                    preference.reminderTime ??
                    mitzvah.defaultTime ??
                    '07:30'
                  }
                  onChange={(time) => void setReminderTime(mitzvahId, time)}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View
        className="mb-6"
        style={{ height: 1, backgroundColor: colors.border }}
      />

      <View className="mb-4">
        {completed ? (
          <View className="items-center rounded-2xl p-4" style={{ backgroundColor: '#F4F1EA' }}>
            <Text
              style={[
                typography.subtitle,
                { color: colors.success, marginBottom: 4 },
              ]}
            >
              ✓ הושלם היום
            </Text>
            <Text style={typography.bodySmall}>
              {mitzvah.xpReward} XP הוענקו
            </Text>
          </View>
        ) : (
          <View>
            <Text
              style={[
                typography.subtitle,
                { color: colors.accent, marginBottom: 12, textAlign: 'center' },
              ]}
            >
              ⭐ +{mitzvah.xpReward} XP
            </Text>

            <Pressable
              onPress={() => void handleComplete()}
              disabled={isCompleting || !preference?.enabled}
              accessibilityRole="button"
              accessibilityLabel="סיימתי את המצווה"
              className="items-center rounded-2xl py-4"
              style={{
                backgroundColor: colors.primary,
                minHeight: 52,
                opacity: isCompleting || !preference?.enabled ? 0.7 : 1,
              }}
            >
              <Text style={[typography.subtitle, { color: colors.white }]}>
                {isCompleting ? 'שומר...' : 'סיימתי את המצווה'}
              </Text>
            </Pressable>

            {!preference?.enabled ? (
              <Text
                style={[
                  typography.caption,
                  { marginTop: 8, textAlign: 'center' },
                ]}
              >
                הפעל מעקב על מצווה זו כדי לסמן השלמה
              </Text>
            ) : null}
          </View>
        )}

        {completionFeedback ? (
          <View className="mt-4 items-center">
            <Text style={[typography.subtitle, { color: colors.success }]}>
              {completionFeedback}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.accent }]}>
              +{mitzvah.xpReward} XP
            </Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
