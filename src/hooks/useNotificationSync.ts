import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { refreshOsNotificationPermission } from '@/services/notifications';
import { syncNotificationSchedule } from '@/services/notificationScheduler';
import type { CalendarLocationInput } from '@/types/calendar';
import { useMitzvahStore } from '@/store/mitzvahStore';

/**
 * Keeps scheduled notifications in sync on app foreground and when
 * preferences/mitzvot change. Does not request permission.
 */
export function useNotificationSync(
  userId: string | undefined,
  location?: CalendarLocationInput,
): void {
  const mitzvot = useMitzvahStore((state) => state.mitzvot);
  const preferences = useMitzvahStore((state) => state.preferences);
  const setOsNotificationPermission = useMitzvahStore(
    (state) => state.setOsNotificationPermission,
  );
  const preferencesRef = useRef(preferences);

  preferencesRef.current = preferences;

  useEffect(() => {
    if (!userId) {
      return;
    }

    void syncNotificationSchedule(
      userId,
      preferencesRef.current,
      mitzvot,
      location,
    );
  }, [userId, mitzvot, preferences, location?.latitude, location?.longitude]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refreshOsNotificationPermission().then((status) => {
          setOsNotificationPermission(status);
        });
        void syncNotificationSchedule(
          userId,
          preferencesRef.current,
          mitzvot,
          location,
        );
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [
    userId,
    mitzvot,
    location?.latitude,
    location?.longitude,
    setOsNotificationPermission,
  ]);
}
