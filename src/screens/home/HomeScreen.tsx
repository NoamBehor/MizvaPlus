import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { DailyLearningCard } from '@/components/home/DailyLearningCard';
import { DailyTriviaCard } from '@/components/home/DailyTriviaCard';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { HolidayPrepCard } from '@/components/home/HolidayPrepCard';
import { NextEventCard } from '@/components/home/NextEventCard';
import { ProgressSummary } from '@/components/home/ProgressSummary';
import { StatsRow } from '@/components/home/StatsRow';
import { TodayMitzvotCard } from '@/components/home/TodayMitzvotCard';
import { ParashaPodcastCard } from '@/components/podcast/ParashaPodcastCard';
import { WeeklyParashaCard } from '@/components/home/WeeklyParashaCard';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { spacing } from '@/constants/theme';
import { useParashaPodcastContextOptional } from '@/context/ParashaPodcastContext';
import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import { useHomeDiagnosticsCapture } from '@/hooks/useHomeDiagnosticsCapture';
import { useNextUpcomingEvent } from '@/hooks/useNextUpcomingEvent';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useZmanimLocation } from '@/hooks/useZmanimLocation';
import { navigateToMitzvahDetail, navigateToMyMitzvot } from '@/navigation/navigationRef';
import { filterEnabledActiveMitzvotForToday } from '@/services/calendarMitzvot';
import { calendarService } from '@/services/calendar';
import { getHolidayContext } from '@/services/holidayContext';
import { isMitzvahCompletedToday } from '@/services/mitzvot';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import { useHolidayContextStore } from '@/store/holidayContextStore';
import { useHolidayGuideNavigationStore } from '@/store/holidayGuideNavigationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import { getActivityDateKey } from '@/utils/timezone';

export function HomeScreen() {
  const user = useUserStore((state) => state.user);
  const mitzvot = useMitzvahStore((state) => state.mitzvot);
  const preferences = useMitzvahStore((state) => state.preferences);
  const preferencesRevision = useMitzvahStore((state) => state.preferencesRevision);
  const completions = useMitzvahStore((state) => state.completions);

  const { calendarInput, zmanimLocation, isResolving: isZmanimResolving } =
    useZmanimLocation();
  const {
    dayInfo,
    isLoading: isCalendarLoading,
    error: calendarError,
  } = useHebrewCalendar(calendarInput);
  const podcast = useParashaPodcastContextOptional();
  const { event: upcomingEvent } = useNextUpcomingEvent(calendarInput);
  useNotificationSync(user?.id, calendarInput);

  const holidayContext = useMemo(() => {
    if (!dayInfo?.events) {
      return getHolidayContext([], upcomingEvent);
    }
    return getHolidayContext(dayInfo.events, upcomingEvent);
  }, [dayInfo?.events, upcomingEvent]);

  const setHolidayContext = useHolidayContextStore((state) => state.setContext);
  const consumePendingHolidayGuide = useHolidayGuideNavigationStore(
    (state) => state.consumePendingHolidayGuide,
  );
  const [forcedHolidayGuide, setForcedHolidayGuide] = useState<{
    holidayKey: string;
    expanded: boolean;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingHolidayGuide();
      if (pending) {
        setForcedHolidayGuide(pending);
      }
    }, [consumePendingHolidayGuide]),
  );

  useEffect(() => {
    setHolidayContext(holidayContext);
  }, [holidayContext, setHolidayContext]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    void calendarService.getUpcomingEvents(14, calendarInput).then((events) => {
      useDiagnosticsStore.getState().setHolidayDiagnostics({
        holidayKey: holidayContext.holidayKey ?? null,
        holidayName: holidayContext.holidayName ?? null,
        hoursUntil: holidayContext.hoursUntil ?? null,
        themeKey: holidayContext.themeKey,
        prepCardEnabled: holidayContext.prepCardEnabled,
        triviaCategories: holidayContext.triviaCategories,
        zmanimLocationSource: zmanimLocation?.source ?? null,
        zmanimLocationAccuracy: zmanimLocation?.accuracy ?? null,
        zmanimLocationAgeSeconds: zmanimLocation
          ? Math.round((Date.now() - zmanimLocation.capturedAt) / 1000)
          : null,
        upcomingEventCount: events.length,
      });
    });
  }, [holidayContext, calendarInput, zmanimLocation]);

  const selectedMitzvotIds = useMemo(
    () =>
      mitzvot
        .filter((mitzvah) => preferences[mitzvah.id]?.enabled)
        .map((mitzvah) => mitzvah.id),
    [mitzvot, preferences],
  );
  useHomeDiagnosticsCapture(dayInfo, selectedMitzvotIds, preferencesRevision);

  const activeMitzvot = useMemo(() => {
    if (!dayInfo) {
      return mitzvot.filter(
        (mitzvah) =>
          mitzvah.category === 'daily' && preferences[mitzvah.id]?.enabled,
      );
    }

    return filterEnabledActiveMitzvotForToday(mitzvot, dayInfo, preferences);
  }, [mitzvot, preferences, dayInfo]);

  const progress = useMemo(() => {
    if (!user) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    if (!dayInfo) {
      const today = getActivityDateKey();
      const enabled = mitzvot.filter(
        (mitzvah) =>
          mitzvah.category === 'daily' && preferences[mitzvah.id]?.enabled,
      );
      const completed = enabled.filter((mitzvah) =>
        completions.some(
          (c) =>
            c.userId === user.id &&
            c.mitzvahId === mitzvah.id &&
            c.completionDate === today,
        ),
      ).length;
      const total = enabled.length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

      return { completed, total, percentage };
    }

    const enabled = filterEnabledActiveMitzvotForToday(
      mitzvot,
      dayInfo,
      preferences,
    );
    const completed = enabled.filter((mitzvah) =>
      isMitzvahCompletedToday(user.id, mitzvah.id, completions),
    ).length;
    const total = enabled.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }, [user, dayInfo, mitzvot, preferences, completions]);

  const isCompletedToday = useCallback(
    (mitzvahId: string) => {
      if (!user?.id) {
        return false;
      }

      return isMitzvahCompletedToday(user.id, mitzvahId, completions);
    },
    [completions, user?.id],
  );

  const handleOpenMitzvah = useCallback((mitzvahId: string) => {
    navigateToMitzvahDetail(mitzvahId);
  }, []);

  const handleSelectMitzvot = useCallback(() => {
    navigateToMyMitzvot();
  }, []);

  const miniPlayerScrollInset =
    podcast?.episode && podcast.hasActiveSession ? 64 + spacing.sm : 0;

  if (!user) {
    return null;
  }

  return (
    <ScreenContainer extraScrollBottomInset={miniPlayerScrollInset}>
      <GreetingHeader displayName={user.displayName} />
      <NextEventCard />
      <ProgressSummary
        completed={progress.completed}
        total={progress.total}
        percentage={progress.percentage}
      />
      <WeeklyParashaCard
        dayInfo={dayInfo}
        isLoading={isCalendarLoading || isZmanimResolving}
        isRefreshing={isCalendarLoading && Boolean(dayInfo?.weeklyParasha)}
        calendarError={calendarError}
      />
      <TodayMitzvotCard
        mitzvot={activeMitzvot}
        isCompleted={isCompletedToday}
        onOpenMitzvah={handleOpenMitzvah}
        onSelectMitzvot={handleSelectMitzvot}
      />
      <HolidayPrepCard
        context={holidayContext}
        overrideHolidayKey={forcedHolidayGuide?.holidayKey}
        initialExpanded={forcedHolidayGuide?.expanded ?? false}
      />
      <DailyTriviaCard userId={user.id} />
      <DailyLearningCard userId={user.id} />
      <ParashaPodcastCard dayInfo={dayInfo} isLoading={isCalendarLoading} />
      <StatsRow streakCount={user.streakCount} xp={user.xp} />
    </ScreenContainer>
  );
}
