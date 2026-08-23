import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { calendarService } from '@/services/calendar';
import type { CalendarDayInfo, CalendarLocationInput } from '@/types/calendar';

export interface UseHebrewCalendarResult {
  dayInfo: CalendarDayInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHebrewCalendar(
  location?: CalendarLocationInput,
): UseHebrewCalendarResult {
  const [dayInfo, setDayInfo] = useState<CalendarDayInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await calendarService.getTodayInfo(location);
      if (isMountedRef.current) {
        setDayInfo(info);
        if (info.freshness === 'unavailable') {
          setError('לא ניתן לטעון את לוח השנה העברי כרגע.');
        }
      }
    } catch {
      if (isMountedRef.current) {
        setError('לא ניתן לטעון את לוח השנה העברי כרגע.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [location?.latitude, location?.longitude]);

  useEffect(() => {
    isMountedRef.current = true;
    void load();

    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void load();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [load]);

  return {
    dayInfo,
    isLoading,
    error,
    refresh: load,
  };
}
