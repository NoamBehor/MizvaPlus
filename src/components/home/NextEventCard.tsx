import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  ThemedTimerBanner,
  TimerHeroSkeleton,
} from '@/components/home/ThemedTimerBanner';
import { LocationSourceSheet } from '@/components/home/ZmanimLocationStatus';
import { DEFAULT_PLACE_NAME } from '@/constants/defaultPlace';
import { shadows, spacing, typography } from '@/constants/theme';
import {
  getTimerTheme,
  resolveTimerTheme,
} from '@/constants/timerThemes';
import { useCountdown } from '@/hooks/useCountdown';
import { useNextUpcomingEvent } from '@/hooks/useNextUpcomingEvent';
import { useZmanimLocation } from '@/hooks/useZmanimLocation';
import {
  formatZmanimLocationDisplayLabel,
  getLocationAgeMs,
  type ZmanimLocation,
} from '@/services/zmanimLocation';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import {
  HOLIDAY_SUBLABEL_IN,
  SHABBAT_SUBLABEL_IN,
  toUpcomingEventDisplay,
} from '@/constants/eventDescriptors';
import { homeTheme } from '@/constants/homeTheme';
import { holidayGuideHasCandleSection } from '@/services/holidayGuideService';

const CANDLE_ACTION_LABEL = 'סדר הדלקת נרות וברכות';

function heroPlaceLabel(source: ZmanimLocation['source'] | undefined): string {
  if (source === 'fresh' || source === 'cached') {
    return 'המיקום שלך';
  }
  return DEFAULT_PLACE_NAME;
}

interface NextEventCardProps {
  onOpenCandleGuide?: () => void;
}

/** Stable fallback so useCountdown is not fed a new ISO string every render while loading. */
const IDLE_COUNTDOWN_TARGET = '1970-01-01T00:00:00.000Z';

export function NextEventCard({ onOpenCandleGuide }: NextEventCardProps) {
  const {
    calendarInput,
    zmanimLocation,
    isResolving: isLocationResolving,
    refresh: refreshLocation,
  } = useZmanimLocation();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { event, isLoading, error, refresh: refreshEvent } =
    useNextUpcomingEvent(calendarInput);

  const displayEvent = useMemo(
    () => (event ? toUpcomingEventDisplay(event) : null),
    [event],
  );

  const handleExpired = useCallback(() => {
    void refreshEvent();
  }, [refreshEvent]);

  const countdown = useCountdown(
    event?.targetDate ?? IDLE_COUNTDOWN_TARGET,
    event ? handleExpired : undefined,
  );

  const isActiveFast = Boolean(event?.fastStartDate);
  const timerThemeKey = event
    ? resolveTimerTheme({
        type: event.type,
        eventType: event.eventType,
        themeKey: event.themeKey,
        holidayKey: event.holidayKey,
        title: event.title,
        subLabel: event.subLabel,
        isActiveFast,
      })
    : 'default';

  const fastProgress = useMemo(() => {
    if (!event?.fastStartDate || event.fastVariant === 'major') {
      return null;
    }

    const startMs = new Date(event.fastStartDate).getTime();
    const endMs = new Date(event.targetDate).getTime();
    const durationMs = endMs - startMs;

    if (durationMs <= 0) {
      return null;
    }

    const elapsedMs = durationMs - countdown.totalSeconds * 1000;
    return Math.min(1, Math.max(0, elapsedMs / durationMs));
  }, [event?.fastStartDate, event?.fastVariant, event?.targetDate, countdown.totalSeconds]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const locationAgeSeconds = zmanimLocation
      ? Math.round(getLocationAgeMs(zmanimLocation) / 1000)
      : null;

    useDiagnosticsStore.getState().setHomeSnapshot({
      nextEventId: event?.id ?? null,
      nextEventType: event?.eventType ?? event?.type ?? null,
      nextEventTitle: event?.title ?? null,
      nextEventSubLabel: event?.subLabel ?? null,
      nextEventHeroLabel: displayEvent?.heroLabel ?? null,
      nextEventThemeKey: event?.themeKey ?? null,
      nextEventDatetime: event?.targetDate ?? null,
      nextEventRemainingSeconds: event ? countdown.totalSeconds : null,
      nextEventRemainingMs: displayEvent?.remainingMs ?? null,
      zmanimLocationSource: zmanimLocation?.source ?? null,
      zmanimLocationAccuracy: zmanimLocation?.accuracy ?? null,
      zmanimLocationAgeSeconds: locationAgeSeconds,
    });
  }, [event, displayEvent, countdown.totalSeconds, zmanimLocation]);

  const locationSheet = (
    <LocationSourceSheet
      visible={locationSheetOpen}
      onClose={() => setLocationSheetOpen(false)}
      location={zmanimLocation}
      isResolving={isLocationResolving}
      onRefresh={() => {
        void refreshLocation();
      }}
    />
  );

  if (isLoading && isLocationResolving) {
    return (
      <View style={{ marginBottom: homeTheme.sectionGap }}>
        <TimerHeroSkeleton />
      </View>
    );
  }

  if (error || !event || !displayEvent) {
    const fallbackTheme = getTimerTheme('default');

    return (
      <View style={{ marginBottom: homeTheme.sectionGap }}>
        <LinearGradient
          colors={fallbackTheme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            shadows.hero,
            {
              borderRadius: homeTheme.heroRadius,
              minHeight: 200,
              paddingVertical: spacing.xl,
              paddingHorizontal: spacing.lg,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          accessibilityRole="alert"
        >
          <Text
            style={[
              typography.subtitle,
              {
                color: fallbackTheme.labelColor,
                textAlign: 'center',
                writingDirection: 'rtl',
                marginBottom: spacing.sm,
              },
            ]}
          >
            הטיימר אינו זמין
          </Text>
          <Text
            style={[
              typography.bodySmall,
              {
                color: fallbackTheme.labelColor,
                textAlign: 'center',
                writingDirection: 'rtl',
                opacity: 0.9,
              },
            ]}
          >
            {error ?? 'אין אירוע קרוב זמין כרגע'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="הגדרת זמני עיר"
            onPress={() => setLocationSheetOpen(true)}
            style={{ marginTop: spacing.md, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={[typography.label, { color: fallbackTheme.textColor }]}>
              מיקום לזמנים
            </Text>
          </Pressable>
        </LinearGradient>
        {locationSheet}
      </View>
    );
  }

  const place = heroPlaceLabel(zmanimLocation?.source);
  const detail = event.subLabel ?? event.title;
  const locationLine = event.displayTime
    ? `${place} • ${detail}:`
    : `${place} • ${detail}`;
  const sourceLabel = formatZmanimLocationDisplayLabel(
    zmanimLocation?.source ?? 'unavailable',
  );
  const canOpenCandle =
    Boolean(onOpenCandleGuide) &&
    (event.subLabel === SHABBAT_SUBLABEL_IN ||
      event.subLabel === HOLIDAY_SUBLABEL_IN) &&
    holidayGuideHasCandleSection(event.holidayKey);

  return (
    <View style={{ marginBottom: homeTheme.sectionGap }}>
      <ThemedTimerBanner
        heroLabel={displayEvent.heroLabel || event.title}
        displayTime={event.displayTime}
        totalSeconds={countdown.totalSeconds}
        themeKey={timerThemeKey}
        isActiveFast={isActiveFast}
        fastProgress={fastProgress}
        locationLine={locationLine}
        locationAccessibilityLabel={`${sourceLabel}. ${locationLine} ${event.displayTime ?? ''}`}
        onOpenLocation={() => setLocationSheetOpen(true)}
        actionLabel={canOpenCandle ? CANDLE_ACTION_LABEL : undefined}
        onAction={canOpenCandle ? onOpenCandleGuide : undefined}
      />
      {locationSheet}
    </View>
  );
}
