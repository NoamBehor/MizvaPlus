import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { processSyncQueue } from '@/services/cloud/syncService';

/**
 * Processes pending cloud sync on mount and when the app returns to foreground.
 * Non-blocking — local state remains authoritative for UI responsiveness.
 */
export function useCloudSync(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) {
      return;
    }

    void processSyncQueue(userId).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void processSyncQueue(userId).catch(() => undefined);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [userId]);
}
