import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getNextUpcomingEvent } from '@/services/events';
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

  return { event, isLoading, error, refresh: load };
}
