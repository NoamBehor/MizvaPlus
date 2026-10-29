import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '@/components/common/ScreenContainer';
import { ExplanationActionCard } from '@/components/mitzvah/explanation/ExplanationActionCard';
import { ExplanationCompletionBar } from '@/components/mitzvah/explanation/ExplanationCompletionBar';
import { ExplanationEssenceCard } from '@/components/mitzvah/explanation/ExplanationEssenceCard';
import { ExplanationHero } from '@/components/mitzvah/explanation/ExplanationHero';
import { ExplanationInsightCard } from '@/components/mitzvah/explanation/ExplanationInsightCard';
import { ExplanationReminderCard } from '@/components/mitzvah/explanation/ExplanationReminderCard';
import { ExplanationTopBar } from '@/components/mitzvah/explanation/ExplanationTopBar';
import { homeTheme } from '@/constants/homeTheme';
import { FAST_MITZVAH_IDS } from '@/constants/calendarMitzvahMap';
import { typography } from '@/constants/theme';
import {
  navigateToHomeHolidayGuide,
} from '@/navigation/navigationRef';
import type { RootStackParamList } from '@/navigation/types';
import { calendarService } from '@/services/calendar';
import { isCalendarMitzvahActiveToday } from '@/services/calendarMitzvot';
import { getHolidayGuide } from '@/services/holidayGuideService';
import { resolveMitzvahFastContext } from '@/services/mitzvahFastContext';
import { getMitzvahById } from '@/services/mitzvot';
import { getPreferredNusach } from '@/services/texts/prayerReaderPreferences';
import {
  canOpenPrayerReader,
  getAvailableNusachim,
  getPrayerCatalogItemForMitzvah,
  getPrayerIdForMitzvah,
} from '@/services/texts/prayerContentService';
import {
  canOpenRitualGuide,
  getAvailableRitualGuideNusachim,
  getRitualGuideIdForMitzvah,
} from '@/services/texts/ritualContentService';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { HebrewCalendarEvent } from '@/types/calendar';
import type { PrayerNusach } from '@/types/prayer';
import {
  buildMitzvahExplanationView,
  type ExplanationNavigation,
} from '@/utils/mitzvahExplanationView';
import { getHolidayKeyForMitzvahId } from '@/utils/mitzvah';

type MitzvahDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MitzvahDetail'
>;

function resolveNusach(
  preferred: PrayerNusach,
  available: PrayerNusach[],
): PrayerNusach {
  if (available.includes(preferred)) {
    return preferred;
  }

  return available[0] ?? 'edot_hamizrach';
}

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
  const [isCompleting, setIsCompleting] = useState(false);
  const [preferredNusach, setPreferredNusachState] =
    useState<PrayerNusach>('edot_hamizrach');
  const [calendarEvents, setCalendarEvents] = useState<HebrewCalendarEvent[]>(
    [],
  );

  const completed = user ? isCompletedToday(user.id, mitzvahId) : false;

  useEffect(() => {
    void getPreferredNusach().then(setPreferredNusachState);
  }, []);

  useEffect(() => {
    void calendarService
      .getUpcomingEvents(45, locationInput)
      .then(setCalendarEvents);
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

    try {
      await markMitzvahComplete(user.id, mitzvahId);
    } finally {
      setIsCompleting(false);
    }
  };

  const openNavigation = (target: ExplanationNavigation) => {
    if (target.kind === 'holiday') {
      navigateToHomeHolidayGuide(target.holidayKey);
      return;
    }

    if (target.kind === 'ritual') {
      navigation.navigate('PrayerReader', {
        ritualGuideId: target.ritualGuideId,
        nusach: target.nusach,
      });
      return;
    }

    navigation.navigate('PrayerReader', {
      prayerId: target.prayerId,
      nusach: target.nusach,
    });
  };

  if (!mitzvah || !user) {
    return (
      <ScreenContainer backgroundColor={homeTheme.canvas}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          style={{ minHeight: 48, alignItems: 'flex-start' }}
        >
          <Text style={typography.label}>→ חזרה</Text>
        </Pressable>
        <Text style={typography.body}>המצווה לא נמצאה.</Text>
      </ScreenContainer>
    );
  }

  const localPrayerId = getPrayerIdForMitzvah(mitzvah.id);
  const localRitualGuideId = getRitualGuideIdForMitzvah(mitzvah.id);
  const prayerCatalogItem = getPrayerCatalogItemForMitzvah(mitzvah.id);
  const holidayKey = getHolidayKeyForMitzvahId(mitzvah.id);
  const holidayGuide = holidayKey ? getHolidayGuide(holidayKey) : null;
  const readerNusach = resolveNusach(
    preferredNusach,
    localPrayerId ? getAvailableNusachim(localPrayerId) : [],
  );
  const ritualGuideNusach = resolveNusach(
    preferredNusach,
    localRitualGuideId
      ? getAvailableRitualGuideNusachim(localRitualGuideId)
      : [],
  );
  const isActiveToday = dayInfo
    ? isCalendarMitzvahActiveToday(mitzvah, dayInfo)
    : mitzvah.category === 'daily';

  const view = buildMitzvahExplanationView({
    mitzvah,
    preference,
    fastContext,
    activeToday: isActiveToday,
    hebrewDateLabel: dayInfo?.hebrewDate.displayString,
    ritual: {
      canOpen: localRitualGuideId
        ? canOpenRitualGuide(localRitualGuideId)
        : false,
      guideId: localRitualGuideId,
      nusach: ritualGuideNusach,
    },
    prayer: {
      canOpen: localPrayerId ? canOpenPrayerReader(localPrayerId) : false,
      prayerId: localPrayerId,
      nusach: readerNusach,
      isPartial: prayerCatalogItem?.availability === 'partial',
      isPending: prayerCatalogItem?.availability === 'pending',
    },
    holiday:
      holidayGuide && holidayKey
        ? { key: holidayKey, titleHebrew: holidayGuide.titleHebrew }
        : null,
  });

  return (
    <ScreenContainer
      backgroundColor={homeTheme.canvas}
      horizontalPadding={20}
      footer={
        <ExplanationCompletionBar
          xpReward={view.xpReward}
          completed={completed}
          trackingEnabled={view.trackingEnabled}
          isCompleting={isCompleting}
          onComplete={() => {
            void handleComplete();
          }}
        />
      }
    >
      <ExplanationTopBar
        category={view.category}
        categoryLabel={view.categoryLabel}
        onBack={() => navigation.goBack()}
      />
      <ExplanationHero
        icon={view.icon}
        title={view.title}
        description={view.description}
        xpReward={view.xpReward}
        timing={view.timing}
        status={view.status}
      />
      <ExplanationEssenceCard body={view.essence} />
      <ExplanationActionCard
        primaryAction={view.primaryAction}
        secondaryAction={view.secondaryAction}
        pendingMessage={view.pendingMessage}
        onPrimaryPress={() => {
          if (view.primaryAction) {
            openNavigation(view.primaryAction.navigation);
          }
        }}
        onSecondaryPress={() => {
          if (view.secondaryAction) {
            openNavigation(view.secondaryAction.navigation);
          }
        }}
      />
      <ExplanationInsightCard paragraphs={view.paragraphs} />
      <ExplanationReminderCard
        reminderEnabled={view.reminderEnabled}
        trackingEnabled={view.trackingEnabled}
        timeLabel={view.reminderTimeLabel}
        pickerValue={view.reminderPickerValue}
        editing={showReminderConfig}
        preferenceReady={view.preferenceReady}
        permissionMessage={permissionDeniedMessage}
        onToggleEdit={() => setShowReminderConfig((current) => !current)}
        onReminderChange={(enabled) => {
          clearPermissionMessage();
          void setReminder(mitzvahId, enabled);
        }}
        onTimeChange={(time) => {
          void setReminderTime(mitzvahId, time);
        }}
      />
    </ScreenContainer>
  );
}
