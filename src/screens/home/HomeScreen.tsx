import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { DailyLearningCard } from '@/components/home/DailyLearningCard';
import { DailyTriviaCard } from '@/components/home/DailyTriviaCard';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { HalachicTimesBar } from '@/components/home/HalachicTimesBar';
import { HolidayPrepCard } from '@/components/home/HolidayPrepCard';
import { NextEventCard } from '@/components/home/NextEventCard';
import { StatsRow } from '@/components/home/StatsRow';
import { TodayMitzvotCard } from '@/components/home/TodayMitzvotCard';
import { ParashaPodcastCard } from '@/components/podcast/ParashaPodcastCard';
import { WeeklyParashaCard } from '@/components/home/WeeklyParashaCard';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { homeTheme } from '@/constants/homeTheme';
import { spacing } from '@/constants/theme';
import { useParashaPodcastContextOptional } from '@/context/ParashaPodcastContext';
import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import { useHomeDiagnosticsCapture } from '@/hooks/useHomeDiagnosticsCapture';
import { useNextUpcomingEvent } from '@/hooks/useNextUpcomingEvent';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useZmanimLocation } from '@/hooks/useZmanimLocation';
import {
  navigateToMitzvahDetail,
  navigateToMyMitzvot,
  navigateToParashaPodcastPlayer,
} from '@/navigation/navigationRef';
import { getDailyHalachicTimes } from '@/services/calendar/dailyZmanim';
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
  const markMitzvahComplete = useMitzvahStore((state) => state.markMitzvahComplete);
  const unmarkMitzvahCompleteToday = useMitzvahStore(
    (state) => state.unmarkMitzvahCompleteToday,
  );

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
  const [candleExpandSignal, setCandleExpandSignal] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const holidayOffsetY = useRef(0);

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

  const handleToggleMitzvah = useCallback(
    (mitzvahId: string) => {
      if (!user) {
        return;
      }
      if (isCompletedToday(mitzvahId)) {
        void unmarkMitzvahCompleteToday(user.id, mitzvahId);
        return;
      }
      void markMitzvahComplete(user.id, mitzvahId);
    },
    [isCompletedToday, markMitzvahComplete, unmarkMitzvahCompleteToday, user],
  );

  const getCompletedAt = useCallback(
    (mitzvahId: string) => {
      if (!user) {
        return null;
      }
      const today = getActivityDateKey();
      return (
        completions.find(
          (completion) =>
            completion.userId === user.id &&
            completion.mitzvahId === mitzvahId &&
            completion.completionDate === today,
        )?.completedAt ?? null
      );
    },
    [completions, user],
  );

  const halachicTimes = useMemo(
    () =>
      getDailyHalachicTimes(
        calendarInput,
      ),
    [calendarInput?.latitude, calendarInput?.longitude],
  );

  const openCandleGuide = useCallback(() => {
    setCandleExpandSignal((value) => value + 1);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, holidayOffsetY.current - spacing.sm),
        animated: true,
      });
    });
  }, []);

  const miniPlayerScrollInset =
    podcast?.episode && podcast.hasActiveSession ? 64 + spacing.sm : 0;

  if (!user) {
    return null;
  }

  return (
    <ScreenContainer
      extraScrollBottomInset={miniPlayerScrollInset}
      backgroundColor={homeTheme.canvas}
      horizontalPadding={20}
      scrollRef={scrollRef}
    >
      <GreetingHeader
        displayName={user.displayName}
        hebrewDate={dayInfo?.hebrewDate.displayString}
      />
      <NextEventCard onOpenCandleGuide={openCandleGuide} />
      <WeeklyParashaCard
        dayInfo={dayInfo}
        isLoading={isCalendarLoading || isZmanimResolving}
        isRefreshing={isCalendarLoading && Boolean(dayInfo?.weeklyParasha)}
        calendarError={calendarError}
        onOpen={podcast?.episode ? navigateToParashaPodcastPlayer : undefined}
      />
      <HalachicTimesBar
        times={isZmanimResolving && !zmanimLocation ? [] : halachicTimes.times}
        calculationNote={halachicTimes.calculationNote}
        locationLabel={halachicTimes.locationLabel}
        isLoading={isZmanimResolving && !zmanimLocation}
      />
      <StatsRow
        streakCount={user.streakCount}
        xp={user.xp}
        userId={user.id}
        completions={completions}
      />
      <TodayMitzvotCard
        mitzvot={activeMitzvot}
        completedCount={progress.completed}
        totalCount={progress.total}
        progressPercentage={progress.percentage}
        streakCount={user.streakCount}
        isCompleted={isCompletedToday}
        getCompletedAt={getCompletedAt}
        onOpenMitzvah={handleOpenMitzvah}
        onToggleMitzvah={handleToggleMitzvah}
        onSelectMitzvot={handleSelectMitzvot}
      />
      <DailyLearningCard userId={user.id} />
      <HolidayPrepCard
        context={holidayContext}
        overrideHolidayKey={forcedHolidayGuide?.holidayKey}
        initialExpanded={forcedHolidayGuide?.expanded ?? false}
        expandSignal={candleExpandSignal}
        forceVisible={candleExpandSignal > 0}
        onLayoutY={(y) => {
          holidayOffsetY.current = y;
        }}
      />
      <DailyTriviaCard userId={user.id} />
      <ParashaPodcastCard dayInfo={dayInfo} isLoading={isCalendarLoading} />
    </ScreenContainer>
  );
}
