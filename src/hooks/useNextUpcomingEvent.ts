import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getNextUpcomingEvent } from '@/services/events';
import { useMitzvahStore } from '@/store/mitzvahStore';
import type { CalendarLocationInput } from '@/types/calendar';
import type { UpcomingEvent } from '@/types/event';

export interface UseNextUpcomingEventResult {
  event: UpcomingEvent | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useNextUpcomingEvent(
  location?: CalendarLocationInput,
): UseNextUpcomingEventResult {
  const [event, setEvent] = useState<UpcomingEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const preferencesRevision = useMitzvahStore((state) => state.preferencesRevision);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const next = await getNextUpcomingEvent(location);
      if (isMountedRef.current) {
        setEvent(next);
        if (!next) {
          setError('אין אירוע קרוב זמין כרגע');
        }
      }
    } catch {
      if (isMountedRef.current) {
        setError('לא ניתן לטעון את האירוע הבא');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [location?.latitude, location?.longitude, preferencesRevision]);

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

  useEffect(() => {
    if (!event?.targetDate) {
      return;
    }

    const targetMs = new Date(event.targetDate).getTime();
    const delayMs = Math.max(0, targetMs - Date.now()) + 250;

    const timer = setTimeout(() => {
      void load();
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [event?.id, event?.targetDate, load]);

  return { event, isLoading, error, refresh: load };
}
