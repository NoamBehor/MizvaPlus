import { useCallback, useMemo } from 'react';

import { DailyLearningCard } from '@/components/home/DailyLearningCard';
import { DailyTriviaCard } from '@/components/home/DailyTriviaCard';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { NextEventCard } from '@/components/home/NextEventCard';
import { ProgressSummary } from '@/components/home/ProgressSummary';
import { StatsRow } from '@/components/home/StatsRow';
import { TodayMitzvotCard } from '@/components/home/TodayMitzvotCard';
import { WeeklyParashaCard } from '@/components/home/WeeklyParashaCard';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useUserLocation } from '@/hooks/useUserLocation';
import { navigateToMitzvahDetail, navigateToMyMitzvot } from '@/navigation/navigationRef';
import { filterEnabledActiveMitzvotForToday } from '@/services/calendarMitzvot';
import { isMitzvahCompletedToday } from '@/services/mitzvot';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import { getActivityDateKey } from '@/utils/timezone';

export function HomeScreen() {
  const user = useUserStore((state) => state.user);
  const mitzvot = useMitzvahStore((state) => state.mitzvot);
  const preferences = useMitzvahStore((state) => state.preferences);
  const completions = useMitzvahStore((state) => state.completions);

  const { location } = useUserLocation();

  const locationInput = useMemo(
    () =>
      location
        ? {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude,
          }
        : undefined,
    [location],
  );

  const { dayInfo, isLoading: isCalendarLoading } = useHebrewCalendar(locationInput);
  useNotificationSync(user?.id, locationInput);

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

  if (!user) {
    return null;
  }

  return (
    <ScreenContainer>
      <GreetingHeader displayName={user.displayName} />
      <NextEventCard />
      <WeeklyParashaCard dayInfo={dayInfo} isLoading={isCalendarLoading} />
      <StatsRow streakCount={user.streakCount} xp={user.xp} />

      <TodayMitzvotCard
        mitzvot={activeMitzvot}
        isCompleted={isCompletedToday}
        onOpenMitzvah={handleOpenMitzvah}
        onSelectMitzvot={handleSelectMitzvot}
      />

      <ProgressSummary
        completed={progress.completed}
        total={progress.total}
        percentage={progress.percentage}
      />

      <DailyTriviaCard userId={user.id} />

      <DailyLearningCard />
    </ScreenContainer>
  );
}
