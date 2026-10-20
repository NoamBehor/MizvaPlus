import { useCallback, useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  ThemedTimerBanner,
  TimerHeroSkeleton,
} from '@/components/home/ThemedTimerBanner';
import { ZmanimLocationStatus } from '@/components/home/ZmanimLocationStatus';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import {
  getTimerTheme,
  resolveTimerTheme,
} from '@/constants/timerThemes';
import { useCountdown } from '@/hooks/useCountdown';
import { useNextUpcomingEvent } from '@/hooks/useNextUpcomingEvent';
import { useZmanimLocation } from '@/hooks/useZmanimLocation';
import {
  getLocationAgeMs,
} from '@/services/zmanimLocation';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import { toUpcomingEventDisplay } from '@/constants/eventDescriptors';

/** Stable fallback so useCountdown is not fed a new ISO string every render while loading. */
const IDLE_COUNTDOWN_TARGET = '1970-01-01T00:00:00.000Z';

export function NextEventCard() {
  const { calendarInput, zmanimLocation, isResolving: isLocationResolving } =
    useZmanimLocation();
  const { event, isLoading, error, refresh } = useNextUpcomingEvent(calendarInput);

  const displayEvent = useMemo(
    () => (event ? toUpcomingEventDisplay(event) : null),
    [event],
  );

  const handleExpired = useCallback(() => {
    void refresh();
  }, [refresh]);

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

  if (isLoading && isLocationResolving) {
    return (
      <View style={{ marginBottom: spacing.md }}>
        <TimerHeroSkeleton />
        <ZmanimLocationStatus
          location={zmanimLocation}
          isResolving={isLocationResolving}
        />
      </View>
    );
  }

  if (error || !event || !displayEvent) {
    const fallbackTheme = getTimerTheme('default');

    return (
      <View style={{ marginBottom: spacing.md }}>
        <LinearGradient
          colors={fallbackTheme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            shadows.hero,
            {
              borderRadius: borderRadius.xxl,
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
        </LinearGradient>
        <ZmanimLocationStatus
          location={zmanimLocation}
          isResolving={isLocationResolving}
        />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <ThemedTimerBanner
        heroLabel={displayEvent.heroLabel}
        title={
          event.title && displayEvent.heroLabel !== event.title
            ? event.title
            : undefined
        }
        displayTime={event.displayTime}
        totalSeconds={countdown.totalSeconds}
        themeKey={timerThemeKey}
        isActiveFast={isActiveFast}
        fastProgress={fastProgress}
      />
      <ZmanimLocationStatus
        location={zmanimLocation}
        isResolving={isLocationResolving}
      />
    </View>
  );
}
