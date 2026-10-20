import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  bootstrapZmanimLocation,
  resolveZmanimLocation,
  toCalendarLocationInput,
  type ZmanimLocation,
} from '@/services/zmanimLocation';
import type { CalendarLocationInput } from '@/types/calendar';

export interface UseZmanimLocationResult {
  zmanimLocation: ZmanimLocation | null;
  calendarInput: CalendarLocationInput | undefined;
  isResolving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useZmanimLocation(): UseZmanimLocationResult {
  const [zmanimLocation, setZmanimLocation] = useState<ZmanimLocation | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const hasLoadedOnceRef = useRef(false);

  const applyLocation = useCallback((location: ZmanimLocation) => {
    if (!isMountedRef.current) {
      return;
    }
    setZmanimLocation(location);
    setError(null);
    hasLoadedOnceRef.current = true;
  }, []);

  const load = useCallback(async (blocking = false) => {
    if (blocking) {
      setIsResolving(true);
    }

    try {
      const location = blocking
        ? await resolveZmanimLocation()
        : await bootstrapZmanimLocation();
      applyLocation(location);
    } catch {
      if (isMountedRef.current) {
        setError('לא ניתן לטעון מיקום לחישוב זמנים');
      }
    } finally {
      if (isMountedRef.current) {
        setIsResolving(false);
      }
    }
  }, [applyLocation]);

  const refresh = useCallback(async () => {
    setIsResolving(true);
    try {
      applyLocation(await resolveZmanimLocation());
    } catch {
      setError('לא ניתן לרענן מיקום לחישוב זמנים');
    } finally {
      setIsResolving(false);
    }
  }, [applyLocation]);

  useEffect(() => {
    isMountedRef.current = true;
    void load(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active' || !hasLoadedOnceRef.current) {
        return;
      }
      void load(false);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [load]);

  return {
    zmanimLocation,
    calendarInput: toCalendarLocationInput(zmanimLocation),
    isResolving,
    error,
    refresh,
  };
}
